from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer, _get_vector_store
from rag.web_search import web_search
from rag.llm import get_client, DEEPSEEK_TEXT_MODEL, DEEPSEEK_VISION_MODEL
from django.conf import settings
import pdfplumber
import uuid
import io
import os
import base64
import logging
import fitz  # pymupdf
from rag.rag_pipeline import _strip_markdown

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# POST /api/chat/   — send a message, get answer
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def farmer_chat(request):
    question = request.data.get("question", "").strip()
    if not question:
        return Response({"error": "question is required"}, status=400)

    session_id = request.data.get("session_id")

    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            session = ChatSession.objects.create(
                user=request.user,
                session_id=session_id,
                title="New Chat",
            )
    else:
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title="New Chat",
        )

    if session.title == "New Chat":
        session.title = question[:80]
        session.save(update_fields=["title"])

    ChatMessage.objects.create(session=session, role="user", input_text=question)

    # ── Load conversation history for follow-up context ──────────────────
    chat_history = []
    prior_messages = session.messages.order_by("timestamp").all()
    # Exclude the message we just created (the current question) and take last 20
    history_qs = list(prior_messages)
    # Remove the very last one (the one we just saved above)
    if history_qs and history_qs[-1].input_text == question:
        history_qs = history_qs[:-1]
    for msg in history_qs[-20:]:
        if msg.role == "user" and msg.input_text:
            chat_history.append({"role": "user", "content": msg.input_text})
        elif msg.role == "assistant" and msg.output_text:
            chat_history.append({"role": "assistant", "content": msg.output_text})

    answer, retrieved, confidence, web_supplemented = get_answer(question, chat_history=chat_history)

    ChatMessage.objects.create(
        session=session,
        role="assistant",
        output_text=answer,
        retrieved_chunks=retrieved,
        confidence=confidence,
    )

    return Response({
        "answer": answer,
        "retrieved": retrieved,
        "confidence": confidence,
        "web_supplemented": web_supplemented,
        "session_id": session.session_id,
        "title": session.title,
    })


# ─────────────────────────────────────────────
# Helpers for analyze_pdf
# ─────────────────────────────────────────────

AGRI_SYSTEM_PROMPT = (
    "你是智农平台的农业文档分析专家。"
    "首先，判断这份文档是否与农业相关（种植、作物、养殖、土壤、气象、乡村振兴等）。"
    "如果与农业无关，请一字不差地回复：\n"
    "“这份文件似乎与农业生产无关，我只能分析农业相关的文档。”\n"
    "如果相关，请严格按照用户要求基于文档内容完成任务。"
    "用户要求总结、分析或解释时，只依据文档内容作答。"
    "用户没有具体要求时，给出简明摘要（3-5 句）、关键要点（列表）和实用建议。"
    "用简单、接地气的农民朋友能听懂的中文。\n\n"
    "🚨 严格规则：\n"
    "- 绝不使用 markdown 符号（**、## 等）。\n"
    "- 用相关 emoji（🌾 🌱 💧 📄 📋 ✅ ⚠️ 等）区分段落和要点。\n"
    "- 步骤用数字列表（1. 2. 3.）或圆点。\n"
    "- 不要说“根据原文”“基于所提供文档”之类的话。\n"
    "- 不要提到文件名或“来源”。\n"
    "- 直接以领域专家的口吻给出分析。"
)


def _summarize_text(llm_client, filename, text, truncated, user_prompt=None):
    """Summarize extracted text via DeepSeek text model."""
    req_text = user_prompt if user_prompt else "请分析这份农业文档并总结要点。"
    prompt = (
        f"User Request: {req_text}\n\n"
        f"Document: {filename}\n\nContent:\n{text}"
        + ("\n\n[Note: Document was truncated due to length]" if truncated else "")
    )
    resp = llm_client.chat.completions.create(
        model=DEEPSEEK_TEXT_MODEL,
        messages=[
            {"role": "system", "content": AGRI_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()


def _summarize_images(llm_client, filename, page_images, user_prompt=None):
    """
    Send PDF page images to DeepSeek vision model for OCR + analysis.
    page_images: list of (page_num, base64_png_string)
    """
    req_text = user_prompt if user_prompt else "请分析这份农业文档并总结要点。"
    # Build a multi-image message — DeepSeek vision accepts multiple image_url content parts
    content = [
        {
            "type": "text",
            "text": (
                f"User Request: {req_text}\n\n"
                f"The following are pages from a PDF document '{filename}'. "
                f"Please follow the system instructions and evaluate/analyze the content."
            ),
        }
    ]
    for page_num, b64 in page_images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{b64}"
            },
        })

    resp = llm_client.chat.completions.create(
        model=DEEPSEEK_VISION_MODEL,
        messages=[
            {"role": "system", "content": AGRI_SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()


# ─────────────────────────────────────────────
# POST /api/chat/analyze-pdf/
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_pdf(request):
    pdf_file = request.FILES.get("file")
    if not pdf_file:
        return Response({"error": "没有上传文件"}, status=400)
    if not pdf_file.name.lower().endswith(".pdf"):
        return Response({"error": "仅支持 PDF 文件"}, status=400)

    pdf_bytes = pdf_file.read()
    user_prompt = request.data.get("prompt", "").strip()

    used_ocr = False
    summary = ""
    pages_processed = 0
    was_truncated = False

    # ── Stage 1: Try text extraction with pdfplumber ──────────────────────────
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = []
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"[Page {i}]\n{text.strip()}")
        full_text = "\n\n".join(pages_text)
    except Exception:
        full_text = ""

    if full_text.strip():
        # Good text — summarize normally
        MAX_CHARS = 12000
        truncated_text = full_text[:MAX_CHARS]
        was_truncated = len(full_text) > MAX_CHARS
        pages_processed = len(pages_text)
    else:
        # ── Stage 2: Image-based PDF — render pages → vision model ────────────
        used_ocr = True
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            MAX_PAGES = 5  # Limit to avoid exceeding vision model context (max 5 images)
            page_images = []
            for i, page in enumerate(doc):
                if i >= MAX_PAGES:
                    was_truncated = True
                    break
                # Render at 150 DPI (matrix scale factor ~2.08 for 72→150 dpi)
                mat = fitz.Matrix(150 / 72, 150 / 72)
                pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB, alpha=False)
                png_bytes = pix.tobytes("png")
                b64 = base64.b64encode(png_bytes).decode("utf-8")
                page_images.append((i + 1, b64))
            doc.close()
            pages_processed = len(page_images)
        except Exception as e:
            return Response({"error": f"无法渲染 PDF 页面：{str(e)}"}, status=400)

        if not page_images:
            return Response({"error": "PDF 为空或无法读取。"}, status=422)

        # For OCR PDFs, we need to extract some text to check relevance against the DB
        # Run a quick dummy call or just rely on the LLM to reject it?
        # Since OCR is expensive, let's just let the LLM reject it using the AGRI_SYSTEM_PROMPT.
        # But for text PDFs, we CAN check the vector DB for relevance.
        
    # ── Database Relevance Check (Text PDFs) ─────────────────────────────────
    if not used_ocr and full_text.strip():
        # Check relevance: search the vector store with the first chunk of the PDF
        check_text = full_text[:1000]
        results = _get_vector_store().search(check_text, k=3, threshold=0.0) # get top 3 regardless of threshold
        if results:
            max_score = max(r["score"] for r in results)
            # If the best match in our agricultural database has a cosine similarity < 0.15,
            # it's highly likely this document has nothing to do with agriculture.
            if max_score < 0.15:
                err_msg = "This document does not appear to be related to agriculture or farming. I can only assist with agriculture-related documents."
                # Save as a rejected chat
                session_id = request.data.get("session_id")
                session = None
                if session_id:
                    try:
                        session = ChatSession.objects.get(session_id=session_id, user=request.user)
                    except ChatSession.DoesNotExist:
                        pass
                if not session:
                    session = ChatSession.objects.create(
                        user=request.user,
                        session_id=str(uuid.uuid4()),
                        title=f"已拒绝：{pdf_file.name[:30]}",
                    )
                user_msg_content = user_prompt if user_prompt else "请分析这份文档并总结要点。"
                user_msg = f"[PDF 文件：{pdf_file.name}]\n{user_msg_content}"
                ChatMessage.objects.create(session=session, role="user", input_text=user_msg)
                ChatMessage.objects.create(session=session, role="assistant", output_text=err_msg, confidence="LOW")
                
                return Response({
                    "summary": err_msg,
                    "filename": pdf_file.name,
                    "pages": pages_processed,
                    "truncated": was_truncated,
                    "used_ocr": used_ocr,
                    "session_id": session.session_id,
                    "title": session.title,
                })

    # ── LLM Analysis ─────────────────────────────────────────────────────────
    if not used_ocr:
        try:
            summary = _summarize_text(get_client(), pdf_file.name, truncated_text, was_truncated, user_prompt)
        except Exception as e:
            return Response({"error": f"AI 调用出错：{str(e)}"}, status=500)
    else:
        try:
            summary = _summarize_images(get_client(), pdf_file.name, page_images, user_prompt)
        except Exception as e:
            return Response({"error": f"图像识别调用出错：{str(e)}"}, status=500)

    # ── Save to session ──────────────────────────────────────────────────────
    session_id = request.data.get("session_id")
    session = None
    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            pass
    if not session:
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title=f"文档分析：{pdf_file.name[:60]}",
        )
    if session.title == "New Chat":
        session.title = f"Analysis: {pdf_file.name[:60]}"
        session.save(update_fields=["title"])

    user_msg_content = user_prompt if user_prompt else "请分析这份文档并总结要点。"
    user_msg = f"[PDF 文件：{pdf_file.name}]\n{user_msg_content}"
    ChatMessage.objects.create(session=session, role="user", input_text=user_msg)
    ChatMessage.objects.create(session=session, role="assistant", output_text=summary, confidence="HIGH")

    return Response({
        "summary": summary,
        "filename": pdf_file.name,
        "pages": pages_processed,
        "truncated": was_truncated,
        "used_ocr": used_ocr,
        "session_id": session.session_id,
        "title": session.title,
    })


# ─────────────────────────────────────────────
# Helpers: session + message persistence
# ─────────────────────────────────────────────

def _get_or_create_session(request, session_id, title="New Chat"):
    """Find existing session or create a new one."""
    session = None
    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            pass
    if not session:
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title=title,
        )
    if session.title == "New Chat":
        session.title = title
        session.save(update_fields=["title"])
    return session


def _save_messages(session, user_text, assistant_text, confidence="HIGH", attachment_url=None):
    """Save a user + assistant message pair."""
    ChatMessage.objects.create(
        session=session, role="user", input_text=user_text,
        attachment_url=attachment_url,
    )
    ChatMessage.objects.create(
        session=session, role="assistant",
        output_text=assistant_text, confidence=confidence,
    )


# ─────────────────────────────────────────────
# POST /api/chat/analyze-image/
# ─────────────────────────────────────────────

IMAGE_ANALYSIS_SYSTEM_PROMPT = (
    "你是智农平台的农业图像诊断专家。\n"
    "分析用户提供的图片，按以下结构回答：\n"
    "1. 🔍 问题诊断 —— 图中显示的是什么问题或状况\n"
    "2. 🧪 原因分析 —— 可能是什么原因引起的\n"
    "3. 💡 解决办法 —— 分步骤给出实用、可操作的处置建议\n\n"
    "用简单、接地气的农民朋友能听懂的中文。\n"
    "如果图片看起来与农业生产无关，请直接说明。\n\n"
    "🚨 严格规则：\n"
    "- 绝不使用 markdown 符号（**、## 等）。\n"
    "- 用相关 emoji（🌾 🌱 💧 🐛 🧑‍🌾 ✅ ⚠️ 等）区分段落和要点。\n"
    "- 步骤用数字列表（1. 2. 3.）或圆点。\n"
    "- 不要说“根据图片”“基于所提供内容”之类的话。\n"
    "- 直接以领域专家的口吻给出诊断。\n"
    "- 严格按照 🔍 问题诊断、🧪 原因分析、💡 解决办法 三段结构回答。\n"
    "- 如有网络补充资料，结合它给出更完整的分析。"
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp",
}


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_image(request):
    image_file = request.FILES.get("image")
    if not image_file:
        return Response({"error": "没有上传图片"}, status=400)

    content_type = image_file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        return Response(
            {"error": f"不支持的文件类型“{content_type}”，请上传 JPG、PNG 或 WebP 图片。"},
            status=400,
        )

    user_prompt = request.data.get("prompt", "").strip()
    session_id = request.data.get("session_id", "").strip() or None

    # ── Read and encode image ────────────────────────────────────────────────
    image_bytes = image_file.read()
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    mime = content_type if content_type else "image/jpeg"

    # ── Save image to media/chat_images/ for persistent display ─────────────
    chat_images_dir = os.path.join(settings.MEDIA_ROOT, "chat_images")
    os.makedirs(chat_images_dir, exist_ok=True)
    ext = mime.split("/")[-1]  # e.g. jpeg, png, webp
    if ext == "jpeg":
        ext = "jpg"
    saved_filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    saved_path = os.path.join(chat_images_dir, saved_filename)
    with open(saved_path, "wb") as f:
        f.write(image_bytes)
    image_url = f"{settings.MEDIA_URL}chat_images/{saved_filename}"

    # ── Vector relevance check ───────────────────────────────────────────────
    check_text = user_prompt
    if not check_text:
        # No prompt — ask the vision model for a short description first
        try:
            desc_resp = get_client().chat.completions.create(
                model=DEEPSEEK_VISION_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "用一句话简短描述这张图片的内容（作物、植株、土壤、动物等）。"
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
                            {"type": "text", "text": "这张图片显示的是什么？"},
                        ],
                    },
                ],
                temperature=0.1,
                max_tokens=100,
            )
            check_text = desc_resp.choices[0].message.content.strip()
        except Exception:
            check_text = ""

    # Track relevance for web fallback decision
    vector_max_score = 0.0
    if check_text:
        results = _get_vector_store().search(check_text, k=3, threshold=0.0)
        if results:
            vector_max_score = max(r["score"] for r in results)
            if vector_max_score < 0.15:
                err_msg = (
                    "This image/query does not appear to be related to agriculture "
                    "or farming. I can only assist with agriculture-related queries."
                )
                session = _get_or_create_session(
                    request, session_id, title=f"已拒绝：{image_file.name[:30]}",
                )
                _save_messages(
                    session,
                    user_text=f"[图片上传：{image_file.name}]\n{user_prompt or '请诊断这张图片。'}",
                    assistant_text=err_msg,
                    confidence="LOW",
                    attachment_url=image_url,
                )
                return Response({
                    "summary": err_msg,
                    "filename": image_file.name,
                    "session_id": session.session_id,
                    "title": session.title,
                })

    # ── Web scraping fallback (low local relevance) ────────────────────────
    web_context = ""
    if check_text and vector_max_score < 0.30:
        logger.info(f"Low vector relevance ({vector_max_score:.2f}), fetching web context for: {check_text[:80]}")
        try:
            web_context = web_search(check_text)
        except Exception as e:
            logger.warning(f"Web search failed: {e}")
            web_context = ""

    # ── Vision LLM Analysis ──────────────────────────────────────────────────
    analysis_prompt = (
        user_prompt
        if user_prompt
        else "What issue does this image show? Please identify the problem, its cause, and suggest a solution."
    )

    # If we have web context, append it to the analysis prompt
    if web_context:
        analysis_prompt += (
            "\n\n📚 Supplementary Web Context (use this to enhance your analysis):\n"
            f"{web_context}"
        )

    content = [
        {"type": "text", "text": analysis_prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
    ]

    try:
        resp = get_client().chat.completions.create(
            model=DEEPSEEK_VISION_MODEL,
            messages=[
                {"role": "system", "content": IMAGE_ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        summary = resp.choices[0].message.content.strip()
        summary = _strip_markdown(summary)
    except Exception as e:
        return Response({"error": f"图像识别调用出错：{str(e)}"}, status=500)

    # ── Save to session ──────────────────────────────────────────────────────
    session = _get_or_create_session(
        request, session_id, title=f"图片诊断：{image_file.name[:50]}",
    )
    _save_messages(
        session,
        user_text=f"[图片上传：{image_file.name}]\n{user_prompt or '请诊断这张图片。'}",
        assistant_text=summary,
        confidence="HIGH",
        attachment_url=image_url,
    )

    return Response({
        "summary": summary,
        "filename": image_file.name,
        "session_id": session.session_id,
        "title": session.title,
    })


# ─────────────────────────────────────────────
# GET /api/chat/sessions/
# ─────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    sessions = ChatSession.objects.filter(user=request.user).order_by("-updated_at")
    data = []
    for s in sessions:
        last_msg = s.messages.last()
        data.append({
            "session_id": s.session_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "last_message": (last_msg.output_text or last_msg.input_text or "")[:80]
            if last_msg else "",
        })
    return Response(data)


# ─────────────────────────────────────────────
# GET / DELETE / PATCH /api/chat/sessions/<id>/
# ─────────────────────────────────────────────
@api_view(["GET", "DELETE", "PATCH"])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    try:
        session = ChatSession.objects.get(session_id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    if request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if request.method == "PATCH":
        new_title = request.data.get("title", "").strip()
        if new_title:
            session.title = new_title[:200]
            session.save(update_fields=["title"])
        return Response({"session_id": session.session_id, "title": session.title})

    # GET — return all messages
    messages = []
    for msg in session.messages.all():
        if msg.role == "user":
            content = msg.input_text or ""
            entry = {
                "id": f"db-{msg.id}",
                "role": "user",
                "content": content,
                "timestamp": msg.timestamp.isoformat(),
            }
            # Detect image uploads
            if content.startswith("[图片上传："):
                bracket_end = content.index("]")
                entry["isImageUpload"] = True
                entry["imageName"] = content[len("[图片上传："):bracket_end]
                entry["content"] = content[bracket_end + 2:]  # text after "]\n"
                if msg.attachment_url:
                    entry["imagePreviewUrl"] = msg.attachment_url
            # Detect PDF uploads
            elif content.startswith("[PDF 文件："):
                bracket_end = content.index("]")
                entry["isPdfUpload"] = True
                entry["pdfName"] = content[len("[PDF 文件："):bracket_end]
                entry["content"] = content[bracket_end + 2:]  # text after "]\n"
            messages.append(entry)
        else:
            messages.append({
                "id": f"db-{msg.id}",
                "role": "assistant",
                "content": msg.output_text or "",
                "retrieved": msg.retrieved_chunks or [],
                "confidence": msg.confidence,
                "timestamp": msg.timestamp.isoformat(),
            })
    return Response({
        "session_id": session.session_id,
        "title": session.title,
        "messages": messages,
    })
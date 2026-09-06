import io
from dataclasses import dataclass

import pymupdf
from PIL import Image, UnidentifiedImageError


PDF_MAX_BYTES = 10 * 1024 * 1024
PDF_MAX_PAGES = 100
IMAGE_MAX_BYTES = 8 * 1024 * 1024
IMAGE_MAX_PIXELS = 25_000_000
IMAGE_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


class UploadValidationError(ValueError):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ValidatedUpload:
    content: bytes
    content_type: str
    extension: str
    pages: int | None = None
    width: int | None = None
    height: int | None = None


def _read_limited(upload, max_bytes):
    declared_size = getattr(upload, "size", None)
    if declared_size is not None and declared_size > max_bytes:
        raise UploadValidationError("file_too_large", "文件超过允许大小。", 413)
    content = upload.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise UploadValidationError("file_too_large", "文件超过允许大小。", 413)
    if not content:
        raise UploadValidationError("empty_file", "上传的文件为空。")
    return content


def validate_pdf(upload):
    content = _read_limited(upload, PDF_MAX_BYTES)
    if not upload.name.lower().endswith(".pdf") or not content.startswith(b"%PDF-"):
        raise UploadValidationError("invalid_pdf", "文件不是有效的 PDF。")
    try:
        document = pymupdf.open(stream=content, filetype="pdf")
        page_count = document.page_count
        is_encrypted = document.needs_pass
        document.close()
    except Exception as exc:
        raise UploadValidationError("invalid_pdf", "PDF 已损坏或无法解析。") from exc
    if is_encrypted:
        raise UploadValidationError("encrypted_pdf", "暂不支持加密 PDF。")
    if page_count < 1:
        raise UploadValidationError("empty_pdf", "PDF 不包含可读取页面。")
    if page_count > PDF_MAX_PAGES:
        raise UploadValidationError(
            "too_many_pages",
            f"PDF 最多支持 {PDF_MAX_PAGES} 页。",
            413,
        )
    return ValidatedUpload(content, "application/pdf", "pdf", pages=page_count)


def validate_image(upload):
    content = _read_limited(upload, IMAGE_MAX_BYTES)
    try:
        with Image.open(io.BytesIO(content)) as image:
            image_format = image.format
            width, height = image.size
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise UploadValidationError("invalid_image", "图片已损坏或格式不受支持。") from exc
    if image_format not in IMAGE_FORMATS:
        raise UploadValidationError("invalid_image_type", "仅支持 JPG、PNG 或 WebP 图片。")
    if width <= 0 or height <= 0 or width * height > IMAGE_MAX_PIXELS:
        raise UploadValidationError(
            "image_too_large",
            "图片总像素不得超过 2500 万。",
            413,
        )
    content_type, extension = IMAGE_FORMATS[image_format]
    return ValidatedUpload(
        content,
        content_type,
        extension,
        width=width,
        height=height,
    )

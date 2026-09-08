from datetime import date

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import render
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User

from .decision import build_farm_tasks, match_subsidies
from .models import AgriProduct, FarmProfile, FarmTask
from .pest_rag import diagnose_pest_with_rag
from .serializers import (
    FarmProfileSerializer,
    FarmTaskSerializer,
    PestDiagnosisSerializer,
    RegisterSerializer,
    TreatmentFollowUpSerializer,
)


@api_view(["POST"])
def register_user(request):
    serializer=RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message":"注册成功"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def farm_profile_view(request):
    """Create or update the user's location/crop/growth-stage profile."""
    old_profile = FarmProfile.objects.filter(user=request.user).first()
    if request.method == "GET":
        if not old_profile:
            return Response(None)
        return Response(FarmProfileSerializer(old_profile).data)

    serializer = FarmProfileSerializer(
        old_profile,
        data=request.data,
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    profile = serializer.save(user=request.user)
    FarmTask.objects.filter(profile=profile).delete()
    tasks = build_farm_tasks(profile)
    FarmTask.objects.bulk_create([FarmTask(profile=profile, **item) for item in tasks])
    return Response(FarmProfileSerializer(profile).data, status=200 if old_profile else 201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def farm_tasks_view(request):
    profile = FarmProfile.objects.filter(user=request.user).first()
    if not profile:
        return Response({"error": "请先完善农事档案"}, status=400)
    queryset = profile.tasks.filter(suggested_date__gte=date.today()).order_by("suggested_date")
    return Response({
        "profile": FarmProfileSerializer(profile).data,
        "tasks": FarmTaskSerializer(queryset, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def agri_products_view(request):
    province = request.query_params.get("province")
    city = request.query_params.get("city")
    category = request.query_params.get("category")
    queryset = AgriProduct.objects.filter(
        is_active=True, store__is_active=True
    ).select_related("store")
    if province:
        queryset = queryset.filter(store__province=province)
    if city:
        queryset = queryset.filter(store__city=city)
    if category:
        queryset = queryset.filter(category=category)

    data = []
    for product in queryset[:100]:
        data.append({
            "id": product.id,
            "store": {
                "id": product.store_id,
                "name": product.store.name,
                "address": product.store.address,
                "phone": product.store.phone,
            },
            "name": product.name,
            "category": product.category,
            "active_ingredient": product.active_ingredient,
            "spec": product.spec,
            "stock": str(product.stock),
            "unit": product.unit,
            "price": str(product.price),
            "is_restricted": product.is_restricted,
        })
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pest_diagnosis_view(request):
    serializer = PestDiagnosisSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    diagnosis = diagnose_pest_with_rag(
        serializer.validated_data["crop"],
        serializer.validated_data["symptom"],
        serializer.validated_data["location"],
    )
    instance = serializer.save(
        user=request.user,
        diagnosis=diagnosis["diagnosis"],
        confidence=diagnosis["confidence"],
        severity=diagnosis["severity"],
        treatment_plan=diagnosis["treatment_plan"],
        needs_human_review=diagnosis["needs_human_review"],
        review_reason=diagnosis["review_reason"],
        status=diagnosis["status"],
    )
    return Response({
        **PestDiagnosisSerializer(instance).data,
        "safety_boundary": diagnosis["safety_boundary"],
        "rag_sources": diagnosis.get("rag_sources", []),
        "diagnosis_engine": diagnosis.get("diagnosis_engine", ""),
        "model_name": diagnosis.get("model_name", ""),
        "region_note": diagnosis.get("region_note", ""),
        "safety_filter": diagnosis.get("safety_filter", ""),
        "degradation_reason": diagnosis.get("degradation_reason", ""),
    }, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pest_diagnoses_view(request):
    queryset = PestDiagnosis.objects.filter(user=request.user).order_by("-created_at")
    return Response(PestDiagnosisSerializer(queryset, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def treatment_follow_up_view(request):
    serializer = TreatmentFollowUpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    diagnosis = serializer.validated_data["diagnosis"]
    if diagnosis.user_id != request.user.id:
        return Response({"error": "不能回访其他用户的诊断记录"}, status=403)
    if hasattr(diagnosis, "follow_up"):
        return Response({"error": "该诊断已有回访记录"}, status=400)
    serializer.save()
    diagnosis.status = "followed_up"
    diagnosis.save(update_fields=["status", "updated_at"])
    return Response(serializer.data, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def subsidy_match_view(request):
    if request.data.get("crop") not in dict(FarmProfile.CROP_CHOICES) or request.data.get("area") is None:
        return Response({"error": "请选择作物并填写面积"}, status=400)
    try:
        area = float(request.data["area"])
    except (TypeError, ValueError):
        return Response({"error": "面积必须是数字"}, status=400)
    if not 0 < area <= 100000:
        return Response({"error": "面积需在 0-100000 亩之间"}, status=400)

    items = match_subsidies(
        crop=request.data["crop"],
        area=area,
        needs_machine=bool(request.data.get("needs_machine")),
        contracted_land=bool(request.data.get("contracted_land")),
    )
    return Response({
        "items": items,
        "estimated_total": [
            round(sum(item["estimated_amount"][0] for item in items), 2),
            round(sum(item["estimated_amount"][1] for item in items), 2),
        ],
        "disclaimer": "估算结果仅供准备申报材料参考，最终以县（区）当年政策文件和审核结果为准。",
    })


def home(request):
    return render(request, "home.html")


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email=request.data.get("email")
    if not email:
        return Response({"error":"请输入邮箱"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user=User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error":"该邮箱尚未注册"}, status=status.HTTP_404_NOT_FOUND)

    uid=urlsafe_base64_encode(force_bytes(user.pk))
    token=default_token_generator.make_token(user)
    reset_link=f"{settings.FRONTEND_BASE_URL}/reset-password/{uid}/{token}"
    html_content=f"""
    <html>
    <body>
        <p>您好，</p>
        <p>您正在申请重置 FarmEasy 密码。</p>
        <p>
        <a href="{reset_link}"
            style="padding:10px 15px;background-color:#4CAF50;color:white;text-decoration:none;border-radius:5px;">
            重置密码
        </a>
        </p>
        <p>如非本人操作，请忽略这封邮件。</p>
        <br>
        <p>— FarmEasy 团队</p>
    </body>
    </html>
    """
    send_mail(
        subject="重置 FarmEasy 密码",
        message=f"请点击链接重置密码：{reset_link}",
        from_email=None,
        recipient_list=[email],
        html_message=html_content
    )
    return Response({"message":"密码重置链接已发送到邮箱"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    uidb64=request.data.get("uid")
    token=request.data.get("token")
    new_password=request.data.get("new_password")

    if not all(isinstance(value, str) and value for value in (uidb64, token, new_password)):
        return Response({"error":"所有字段均为必填"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid=int(force_str(urlsafe_base64_decode(uidb64)))
        if not 0 < uid <= 9223372036854775807:
            raise ValueError("Invalid user ID")
    except (ValueError, TypeError, UnicodeDecodeError, OverflowError):
        return Response({"error":"重置链接无效"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        try:
            user=User.objects.select_for_update().get(pk=uid)
        except User.DoesNotExist:
            return Response({"error": "重置链接无效"}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({"error": "重置链接无效或已过期"}, status=400)
        try:
            RegisterSerializer().validate_password(new_password)
        except ValidationError as exc:
            return Response({"error": exc.detail}, status=400)
        user.set_password(new_password)
        user.save(update_fields=["password"])

    return Response({"message":"密码重置成功"}, status=status.HTTP_200_OK)

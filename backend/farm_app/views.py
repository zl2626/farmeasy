import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import render
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.utils.encoding import force_bytes,force_str
from django.core.mail import send_mail
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import RegisterSerializer
from .throttles import AuthAnonRateThrottle, AuthUserRateThrottle
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)
PASSWORD_RECOVERY_RESPONSE = {"message": "如果该邮箱已注册，我们会发送密码重置邮件。"}

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle, AuthUserRateThrottle])
def register_user(request):
    serializer=RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message":"注册成功"},
            status=status.HTTP_201_CREATED
        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
# Create your views here.
def home(request):
    return render(request,"home.html")

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle, AuthUserRateThrottle])
def forgot_password(request):
    email=request.data.get("email")

    if not email:
        return Response(
            {"error":"请输入邮箱地址"},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = User.objects.filter(email__iexact=email.strip()).first()
    if user is None:
        return Response(PASSWORD_RECOVERY_RESPONSE, status=status.HTTP_200_OK)
    uid=urlsafe_base64_encode(force_bytes(user.pk))
    token=default_token_generator.make_token(user)

    reset_link=f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

    html_content = f"""
    <html>
    <body>
        <p>您好：</p>
        <p>我们收到了您的密码重置请求。</p>
        <p>
        <a href="{reset_link}"
            style="padding:10px 15px;
                    background-color:#4CAF50;
                    color:white;
                    text-decoration:none;
                    border-radius:5px;">
            重置密码
        </a>
        </p>
        <p>若非本人操作，请忽略此邮件，原密码不会改变。</p>
        <br>
        <p>智农服务平台</p>
    </body>
    </html>
    """
    try:
        send_mail(
            subject="智农服务平台密码重置",
            message=f"请通过以下链接重置密码：{reset_link}",
            from_email=None,
            recipient_list=[user.email],
            html_message=html_content,
        )
    except Exception:
        logger.exception("Failed to send password reset email for user_id=%s", user.pk)

    return Response(PASSWORD_RECOVERY_RESPONSE, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle, AuthUserRateThrottle])
def reset_password(request):
    uidb64=request.data.get("uid")
    token=request.data.get("token")
    new_password=request.data.get("new_password")

    if not uidb64 or not token or not new_password:
        return Response(
            {"error":"重置链接和新密码不能为空"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        uid=force_str(urlsafe_base64_decode(uidb64))
        user=User.objects.get(pk=uid)
        if not default_token_generator.check_token(user, token):
            raise ValueError("invalid token")
        validate_password(new_password, user=user)
    except ValidationError as exc:
        return Response(
            {"error": "新密码不符合安全要求", "details": exc.messages},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {"error":"重置链接无效或已过期"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()

    return Response(
        {"message":"密码重置成功"},
        status=status.HTTP_200_OK
    )

from django.shortcuts import render
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.utils.encoding import force_bytes,force_str
from django.core.mail import send_mail
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import RegisterSerializer
from django.contrib.auth.models import User

@api_view(["POST"])
def register_user(request):
    serializer=RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message":"User Registred successfully"},
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
def forgot_password(request):
    email=request.data.get("email")

    if not email:
        return Response(
            {"error":"Email is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user=User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {"error":"No user registred with this email"},
            status=status.HTTP_404_NOT_FOUND
        )
    uid=urlsafe_base64_encode(force_bytes(user.pk))
    token=default_token_generator.make_token(user)

    reset_link=f"http://localhost:5173/reset-password/{uid}/{token}"
    print(reset_link)

    html_content = f"""
    <html>
    <body>
        <p>Hello,</p>
        <p>You requested to reset your password.</p>
        <p>
        <a href="{reset_link}"
            style="padding:10px 15px;
                    background-color:#4CAF50;
                    color:white;
                    text-decoration:none;
                    border-radius:5px;">
            Reset Password
        </a>
        </p>
        <p>If you didn’t request this, please ignore this email.</p>
        <br>
        <p>— FarmEasy Team</p>
    </body>
    </html>
    """
    send_mail(
        subject="Password reset - FarmEasy",
        message=f"Click the link to reset your password.",
        from_email=None,
        recipient_list=[email],
        html_message=html_content
    )
    return Response(
        {"message":"Password reset link sent to you email"},
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    print("RAW DATA:", request.data)
    uidb64=request.data.get("uid")
    token=request.data.get("token")
    new_password=request.data.get("new_password")

    if not uidb64 or not token or not new_password:
        return Response(
            {"error":"All fields are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        uid=force_str(urlsafe_base64_decode(uidb64))
        print("done")
        user=User.objects.get(pk=uid)
        print("UID:", uid)
        print("TOKEN:", token)
        print("VALID:", default_token_generator.check_token(user, token))

    except Exception:
        return Response(
            {"error":"Invalid reset link"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()

    return Response(
        {"message":"Password reset successful"},
        status=status.HTTP_200_OK
    )

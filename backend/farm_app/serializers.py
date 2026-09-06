import re
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Profile

class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True)
    mobile_number=serializers.CharField(write_only=True)
    class Meta:
        model= User
        fields=["username","email","password","mobile_number"]

    def validate_username(self,value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("该用户名已被注册，请换一个")
        return value

    def validate_mobile_number(self,value):
        value=value.strip()
        if not re.match(r"^1[3-9]\d{9}$",value):
            raise serializers.ValidationError(
                "请输入正确的 11 位中国手机号（以 1 开头）"
            )
        if Profile.objects.filter(mobile_number=value).exists():
            raise serializers.ValidationError("该手机号已被注册")
        return value

    def validate_email(self,value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("该邮箱已被注册")
        return value

    def validate_password(self,value):
        validate_password(value)
        return value

    def create(self,validated_data):
        mobile=validated_data.pop("mobile_number")

        user=User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        Profile.objects.create(
            user=user,
            mobile_number=mobile,
            role="FARMER"
        )
        return user

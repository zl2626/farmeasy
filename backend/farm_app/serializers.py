import re
from django.db import transaction
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile, FarmProfile, FarmTask, PestDiagnosis, TreatmentFollowUp

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
        if len(value)<6:
            raise serializers.ValidationError("密码至少 6 位")
        return value

    @transaction.atomic
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


class FarmProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmProfile
        fields = ["id", "province", "city", "main_crop", "growth_stage", "planting_area", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class FarmTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmTask
        fields = ["id", "task_type", "title", "description", "suggested_date", "priority", "completed", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class TreatmentFollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentFollowUp
        fields = ["diagnosis", "treatment_date", "product_name", "effect_score", "loss_avoided", "note", "created_at"]
        read_only_fields = ["created_at"]


class PestDiagnosisSerializer(serializers.ModelSerializer):
    follow_up = TreatmentFollowUpSerializer(read_only=True)

    class Meta:
        model = PestDiagnosis
        fields = [
            "id", "crop", "location", "image", "symptom", "diagnosis", "confidence",
            "severity", "treatment_plan", "needs_human_review", "review_reason",
            "status", "created_at", "updated_at", "follow_up",
        ]
        read_only_fields = ["diagnosis", "confidence", "severity", "treatment_plan", "needs_human_review", "review_reason", "status", "created_at", "updated_at"]

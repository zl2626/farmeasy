from rest_framework import serializers
from .models import Scheme,Crop,Doubt,Feedback
from rag.upload_validation import UploadValidationError, validate_image as validate_image_upload


def validate_uploaded_image(value):
    if not value:
        return value
    try:
        validate_image_upload(value)
    except UploadValidationError as exc:
        raise serializers.ValidationError(exc.message) from exc
    value.seek(0)
    return value

class SchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model=Scheme
        fields="__all__"

class CropSerializer(serializers.ModelSerializer):
    def validate_image(self, value):
        return validate_uploaded_image(value)

    class Meta:
        model=Crop
        fields="__all__"

class DoubtSerializer(serializers.ModelSerializer):
    def validate_image(self, value):
        return validate_uploaded_image(value)

    class Meta:
        model = Doubt
        fields = "__all__"
        read_only_fields = ["farmer", "reply", "status"]

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = "__all__"

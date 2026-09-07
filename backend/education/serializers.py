from rest_framework import serializers
from .models import Scheme,Crop,Doubt,Feedback

class SchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model=Scheme
        fields="__all__"

class CropSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        # JSON editors echo the existing URL; only an unchanged URL may be retained.
        if self.instance and self.instance.image and isinstance(data.get("image"), str):
            image_url = self.instance.image.url
            request = self.context.get("request")
            allowed = {image_url}
            if request:
                allowed.add(request.build_absolute_uri(image_url))
            if data["image"] in allowed:
                data = data.copy()
                data.pop("image")
        return super().to_internal_value(data)

    class Meta:
        model=Crop
        fields="__all__"

class DoubtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doubt
        fields = "__all__"
        read_only_fields = ["farmer", "reply", "status"]

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = "__all__"

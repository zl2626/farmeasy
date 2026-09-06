from django.db import models
from django.contrib.auth.models import User

class SoilTYpe(models.Model):
    name=models.CharField(max_length=50,unique=True)
    descripion=models.TextField()

    def __str__(self):
        return self.name

class Scheme(models.Model):
    name=models.CharField(max_length=300,unique=True)
    description=models.TextField()
    benefits=models.TextField()
    eligibility=models.TextField(blank=True)
    official_link=models.URLField(blank=True)
    category = models.CharField(max_length=80, blank=True)
    applicable_region = models.CharField(max_length=200, blank=True)
    issuing_authority = models.CharField(max_length=200, blank=True)
    published_at = models.DateField(null=True, blank=True)
    deadline = models.CharField(max_length=300, blank=True)
    documents = models.JSONField(default=list, blank=True)
    how_to_apply = models.JSONField(default=list, blank=True)
    source = models.CharField(max_length=300, default="智农惠农政策库")
    source_url = models.URLField(blank=True)

    def __str__(self):
        return self.name

class Crop(models.Model):
    class ImageStatus(models.TextChoices):
        UNVERIFIED = "unverified", "未核验"
        VERIFIED = "verified", "已核验"
        REJECTED = "rejected", "不采用"

    crop_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    aliases = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=80, blank=True)
    scientific_name = models.CharField(max_length=120, blank=True)
    season = models.CharField(max_length=200, blank=True)
    soil = models.JSONField(default=list, blank=True)
    duration = models.CharField(max_length=200, blank=True)
    sowing_time = models.CharField(max_length=200, blank=True)
    climate = models.TextField(blank=True)
    water = models.TextField(blank=True)
    rainfall = models.CharField(max_length=200, blank=True)
    fertilizer = models.TextField(blank=True)
    irrigation = models.TextField(blank=True)
    yield_info = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    steps = models.JSONField(default=list, blank=True)
    common_mistakes = models.JSONField(default=list, blank=True)
    image = models.ImageField(upload_to="crops/",null=True,blank=True)
    image_status = models.CharField(
        max_length=20,
        choices=ImageStatus.choices,
        default=ImageStatus.UNVERIFIED,
    )
    image_source_url = models.URLField(blank=True)
    image_license = models.CharField(max_length=120, blank=True)
    image_verified_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=300, default="智农作物知识库")
    source_url = models.URLField(blank=True)

    def __str__(self):
        return self.name

from django.contrib.auth.models import User
from django.db import models

class Doubt(models.Model):
    STATUS_CHOICES = [
        ("Open", "Open"),
        ("Answered", "Answered"),
    ]

    farmer = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()

    image = models.ImageField(upload_to="doubts/", null=True, blank=True)

    reply = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Open"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title



# Create your models here.

class Feedback(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback from {self.name} - {self.subject}"

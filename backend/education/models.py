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

    def __str__(self):
        return self.name

class Crop(models.Model):
    crop_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    season = models.CharField(max_length=50)
    soil = models.JSONField()
    duration = models.CharField(max_length=100)
    sowing_time = models.CharField(max_length=100)
    climate = models.TextField()
    rainfall = models.CharField(max_length=100)
    fertilizer = models.CharField(max_length=100)
    irrigation = models.TextField()
    yield_info = models.CharField(max_length=100)

    steps = models.JSONField()
    common_mistakes = models.JSONField()
    image = models.ImageField(upload_to="crops/",null=True,blank=True)

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

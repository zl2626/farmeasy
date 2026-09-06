from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    Role_choices=(
        ("FARMER","Farmer"),
        ("EXPERT","Expert"),
    )
    user=models.OneToOneField(User,on_delete=models.CASCADE)
    mobile_number=models.CharField(max_length=11,unique=True)
    role=models.CharField(max_length=10,choices=Role_choices,default="FARMER")

    def __str__(self):
        return f"{self.user.username}-{self.role}"
# Create your models here.

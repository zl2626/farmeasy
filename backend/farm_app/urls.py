from django.urls import path
from .views import register_user,forgot_password,reset_password

urlpatterns=[
    path("auth/register/", register_user, name="register"),
    path("auth/forgot-password/", forgot_password, name="forgot-password"),
    path("auth/reset-password/", reset_password, name="reset-password"),
]

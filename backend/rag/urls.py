from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.farmer_chat, name="farmer_chat"),
    path("chat/analyze-pdf/", views.analyze_pdf, name="analyze_pdf"),
    path("chat/analyze-image/", views.analyze_image, name="analyze_image"),
    path("chat/sessions/", views.list_sessions, name="list_sessions"),
    path("chat/sessions/<str:session_id>/", views.session_detail, name="session_detail"),
]

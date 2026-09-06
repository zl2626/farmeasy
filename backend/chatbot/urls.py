from django.urls import path
from .views import mongo_test

urlpatterns=[
    path("mongo-test",mongo_test),
]
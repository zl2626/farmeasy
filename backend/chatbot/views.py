from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .mongodb import get_chat_logs
from django.http import JsonResponse

@api_view(['GET'])
def mongo_test(request):
    chat_logs = get_chat_logs()
    chat_logs.insert_one({
        "test":"MongoDB connection successul"
    })
    return JsonResponse({"status" : "MongoDB Connected successfully"})

# Create your views here.

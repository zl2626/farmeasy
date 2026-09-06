from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from deep_translator import GoogleTranslator
import json

@csrf_exempt
def translate_text(request):
    if request.method == "POST":
        body = json.loads(request.body)
        text = body.get("text")
        source = body.get("source_lang")
        target = body.get("target_lang")
        
        translated_text = GoogleTranslator(
            source=source,
            target=target
        ).translate(text)
       
    return JsonResponse({
           "translatedText": translated_text
       })

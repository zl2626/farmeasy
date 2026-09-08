import requests
import logging

from rest_framework.response import Response
from .models import Scheme,Crop,Doubt,Feedback
from .serializers import SchemeSerializer,CropSerializer,DoubtSerializer,FeedbackSerializer
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from .utils import load_crops_data
from .crop_scraper import scrape_crop_info
from .market_client import DATA_SOURCE, get_growth_ranking, get_market_prices, get_varieties

logger = logging.getLogger(__name__)

def market_prices(request):
    """Return official China wholesale market prices from PFSC."""
    try:
        commodity = request.GET.get("commodity", "猪肉(白条猪)")
        result = get_market_prices(
            commodity=commodity,
            province=request.GET.get("province") or None,
            market=request.GET.get("market") or None,
            query=request.GET.get("query") or None,
            limit=request.GET.get("limit") or None,
        )
        return JsonResponse(
            {
                **result,
                "source": DATA_SOURCE["name"],
                "source_url": DATA_SOURCE["url"],
                "disclaimer": DATA_SOURCE["license"],
                "data_mode": "official_realtime",
            },
            safe=False,
        )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except requests.exceptions.RequestException as exc:
        logger.warning("PFSC market request failed: %s", exc)
        return JsonResponse(
            {"error": "官方行情接口暂时不可用，请稍后重试", "items": [], "unquoted": []},
            status=503,
        )


@api_view(["GET"])
def market_overview(request):
    """Return official national average prices and supported varieties."""
    try:
        ranking = get_growth_ranking()
        varieties = get_varieties()
        return JsonResponse(
            {
                "date": ranking["date"],
                "items": varieties,
                "source": DATA_SOURCE["name"],
                "source_url": DATA_SOURCE["url"],
                "disclaimer": DATA_SOURCE["license"],
                "data_mode": "official_realtime",
            }
        )
    except (requests.exceptions.RequestException, ValueError) as exc:
        logger.warning("PFSC overview request failed: %s", exc)
        return JsonResponse({"error": "官方行情接口暂时不可用，请稍后重试"}, status=503)



@api_view(['GET'])
def agri_schemes(request):
    schemes=Scheme.objects.all()
    serializer=SchemeSerializer(schemes,many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_all_crops(request):
    crops=Crop.objects.all()

    search = request.GET.get("search")
    if search:
        crops = crops.filter(name__icontains=search)
        
    serializer=CropSerializer(crops,many=True)
    return Response(serializer.data)

@api_view(["GET"])
def crop_details(request, crop_name):

    try:

        crop = Crop.objects.get(name__iexact=crop_name)

        data = dict(CropSerializer(crop, context={"request": request}).data)
        data["source"] = "database"
        return Response(data)

    except Crop.DoesNotExist:

        print("[FarmEasy] Crop not in database. Scraping...")

        scraped = scrape_crop_info(crop_name)

        if scraped:

            return Response(scraped)

        return Response({
            "error": "Crop not found"
        }, status=404)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_doubt(request):
    serializer = DoubtSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(farmer=request.user)
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_doubts(request):
    doubts = Doubt.objects.filter(farmer=request.user)
    serializer = DoubtSerializer(doubts, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def reply_doubt(request, pk):
    doubt = Doubt.objects.get(id=pk)

    # Only admin/expert should reply
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)

    doubt.reply = request.data.get("reply")
    doubt.status = "Answered"
    doubt.save()

    return Response({"message": "Reply added"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    try:
        profile = request.user.profile
        mobile_number = profile.mobile_number
        role = profile.role
    except Exception:
        mobile_number = None
        role = "FARMER"

    return Response({
        "username": request.user.username,
        "email": request.user.email,
        "mobile_number": mobile_number,
        "role": role,
        "is_staff": request.user.is_staff,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_doubts(request):
    """Admin-only: return every doubt with farmer details."""
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)

    doubts = Doubt.objects.all().order_by("-created_at")
    data = []
    for d in doubts:
        data.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "image": request.build_absolute_uri(d.image.url) if d.image else None,
            "reply": d.reply,
            "status": d.status,
            "created_at": d.created_at,
            "farmer": {
                "id": d.farmer.id,
                "username": d.farmer.username,
                "email": d.farmer.email,
            },
        })
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_users(request):
    """Admin-only: return all users with profile info."""
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)

    from django.contrib.auth.models import User as DjangoUser
    users = DjangoUser.objects.all().order_by("date_joined")
    data = []
    for u in users:
        try:
            mobile = u.profile.mobile_number
            role = u.profile.role
        except Exception:
            mobile = None
            role = "FARMER"
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "mobile_number": mobile,
            "role": role,
            "is_staff": u.is_staff,
            "date_joined": u.date_joined,
            "last_login": u.last_login,
        })
    return Response(data)


# ─── Admin CRUD: Doubts ───────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_doubt(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    try:
        doubt = Doubt.objects.get(id=pk)
        doubt.delete()
        return Response({"message": "Doubt deleted"})
    except Doubt.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


# ─── Admin CRUD: Users ────────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    from django.contrib.auth.models import User as DjangoUser
    try:
        u = DjangoUser.objects.get(id=pk)
        if u.is_staff:
            return Response({"error": "Cannot delete an admin user"}, status=400)
        u.delete()
        return Response({"message": "User deleted"})
    except DjangoUser.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


# ─── Admin CRUD: Crops ────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_crops(request):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    if request.method == "GET":
        crops = Crop.objects.all().order_by("name")
        return Response(CropSerializer(crops, many=True).data)
    # POST — create new crop
    serializer = CropSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_crop_detail(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    try:
        crop = Crop.objects.get(id=pk)
    except Crop.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if request.method == "DELETE":
        crop.delete()
        return Response({"message": "Crop deleted"})

    partial = request.method == "PATCH"
    serializer = CropSerializer(crop, data=request.data, partial=partial, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── Admin CRUD: Schemes ──────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_schemes(request):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    if request.method == "GET":
        schemes = Scheme.objects.all().order_by("name")
        return Response(SchemeSerializer(schemes, many=True).data)
    serializer = SchemeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_scheme_detail(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)
    try:
        scheme = Scheme.objects.get(id=pk)
    except Scheme.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if request.method == "DELETE":
        scheme.delete()
        return Response({"message": "Scheme deleted"})

    partial = request.method == "PATCH"
    serializer = SchemeSerializer(scheme, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def scheme_details(request, scheme_id):

    try:
        scheme = Scheme.objects.get(id=scheme_id)

        return Response({
            "id": scheme.id,
            "name": scheme.name,
            "description": scheme.description,
            "eligibility": scheme.eligibility,
            "benefits": scheme.benefits,
            "official_link": scheme.official_link,
        })

    except Scheme.DoesNotExist:
        return Response({"error": "Scheme not found"}, status=404)


@api_view(["POST"])
def create_feedback(request):
    serializer = FeedbackSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_feedbacks(request, pk=None):
    if not request.user.is_staff:
        return Response({"error": "Not allowed"}, status=403)

    if request.method == "GET":
        feedbacks = Feedback.objects.all().order_by("-created_at")
        serializer = FeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)

    elif request.method == "DELETE":
        if pk is None:
            return Response({"error": "Feedback ID is required for deletion"}, status=400)
        try:
            feedback = Feedback.objects.get(id=pk)
            feedback.delete()
            return Response({"message": "Feedback deleted"})
        except Feedback.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

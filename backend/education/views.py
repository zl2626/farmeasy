from rest_framework.response import Response
from .models import Scheme,Crop,Doubt,Feedback
from .serializers import SchemeSerializer,CropSerializer,DoubtSerializer,FeedbackSerializer
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from .utils import load_crops_data
from .crop_scraper import scrape_crop_info
import logging

logger = logging.getLogger(__name__)
from .market.providers import get_market_snapshot
from farm_app.throttles import (
    FeedbackAnonRateThrottle,
    FeedbackUserRateThrottle,
    ScrapeAnonRateThrottle,
    ScrapeUserRateThrottle,
)

@api_view(["GET"])
def market_prices(request):
    filters = {
        key: request.GET.get(key, "")
        for key in ("province", "city", "commodity", "category", "keyword", "limit")
    }
    if not filters["province"]:
        filters["province"] = request.GET.get("state", "")
    return Response(get_market_snapshot(filters))


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
@throttle_classes([ScrapeAnonRateThrottle, ScrapeUserRateThrottle])
def crop_details(request, crop_name):

    try:

        crop = Crop.objects.get(name__iexact=crop_name)

        return Response({
            "name": crop.name,
            "scientific_name": crop.scientific_name,
            "soil": crop.soil,
            "climate": crop.climate,
            "season": crop.season,
            "water": crop.water,
            "description": crop.description,
            "source": crop.source,
            "source_url": crop.source_url,
            "image": request.build_absolute_uri(crop.image.url)
            if crop.image and crop.image_status == Crop.ImageStatus.VERIFIED
            else None,
            "image_status": crop.image_status,
        })

    except Crop.DoesNotExist:

        try:
            scraped = scrape_crop_info(crop_name)
        except Exception:
            logger.exception("Crop lookup failed for %r", crop_name)
            return Response(
                {"code": "source_unavailable", "error": "作物资料服务暂时不可用。"},
                status=503,
            )

        if scraped:

            return Response(scraped)

        return Response({
            "code": "crop_not_found",
            "error": "暂未找到该作物资料"
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
    serializer = CropSerializer(crop, data=request.data, partial=partial)
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


@api_view(["GET"])
@throttle_classes([ScrapeAnonRateThrottle, ScrapeUserRateThrottle])
def scrape_scheme_details(request, scheme_id):
    """
    Live-scrape deadline, documents, how-to-apply and status for a scheme.
    Called by the frontend AFTER the DB details panel has already loaded.
    """
    try:
        scheme = Scheme.objects.get(id=scheme_id)
    except Scheme.DoesNotExist:
        return Response({"error": "Scheme not found"}, status=404)

    return Response(
        {
            "status": "local_snapshot",
            "deadline": scheme.deadline or None,
            "documents": scheme.documents,
            "how_to_apply": scheme.how_to_apply,
            "source": scheme.source,
            "source_url": scheme.source_url or scheme.official_link or None,
            "notice": "政策信息可能因地区和年度调整，请以当地主管部门最新通知为准。",
        }
    )


@api_view(["POST"])
@throttle_classes([FeedbackAnonRateThrottle, FeedbackUserRateThrottle])
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

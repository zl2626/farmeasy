from django.urls import path
from .views import (
    market_prices, market_overview, agri_schemes, get_all_crops, create_doubt, my_doubts,
    reply_doubt, user_profile, scheme_details, crop_details,
    all_doubts, all_users,
    admin_delete_doubt, admin_delete_user,
    admin_crops, admin_crop_detail,
    admin_schemes, admin_scheme_detail,
    create_feedback, admin_feedbacks,
)

urlpatterns = [
    path("market-prices/", market_prices),
    path("market-overview/", market_overview),
    path("agri-schemes/", agri_schemes),
    path("crops/", get_all_crops),
    path("doubts/create/", create_doubt),
    path("doubts/my/", my_doubts),
    path("doubts/reply/<int:pk>/", reply_doubt),
    path("profile/", user_profile),
    path("agri-schemes/<int:scheme_id>/", scheme_details),
    path("crops/scrape/<str:crop_name>/", crop_details),
    # Admin list endpoints
    path("admin/doubts/", all_doubts),
    path("admin/users/", all_users),
    # Admin CRUD
    path("admin/doubts/<int:pk>/", admin_delete_doubt),
    path("admin/users/<int:pk>/", admin_delete_user),
    path("admin/crops/", admin_crops),
    path("admin/crops/<int:pk>/", admin_crop_detail),
    path("admin/schemes/", admin_schemes),
    path("admin/schemes/<int:pk>/", admin_scheme_detail),
    path("feedback/create/", create_feedback),
    path("admin/feedbacks/", admin_feedbacks),
    path("admin/feedbacks/<int:pk>/", admin_feedbacks),
]

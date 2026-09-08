from django.urls import path
from .views import (
    register_user,
    forgot_password,
    reset_password,
    farm_profile_view,
    farm_tasks_view,
    agri_products_view,
    pest_diagnosis_view,
    pest_diagnoses_view,
    treatment_follow_up_view,
    subsidy_match_view,
)

urlpatterns=[
    path("auth/register/", register_user),
    path("auth/forgot-password/", forgot_password),
    path("auth/reset-password/", reset_password),
    path("farm/profile/", farm_profile_view),
    path("farm/tasks/", farm_tasks_view),
    path("farm/products/", agri_products_view),
    path("pest/diagnosis/", pest_diagnosis_view),
    path("pest/diagnoses/", pest_diagnoses_view),
    path("pest/follow-up/", treatment_follow_up_view),
    path("subsidy/match/", subsidy_match_view),
]

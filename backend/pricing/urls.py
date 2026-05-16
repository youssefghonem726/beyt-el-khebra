from django.urls import path
from .views import pricing_by_user, pricing_update

urlpatterns = [
    path("by-user/<int:user_id>/", pricing_by_user, name="pricing_by_user"),
    path("<int:pk>/", pricing_update, name="pricing_update"),
]

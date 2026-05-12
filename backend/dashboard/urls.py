from django.urls import path
from dashboard.views import dashboard_stats

urlpatterns = [
    path("stats/", dashboard_stats, name="dashboard_stats"),
]
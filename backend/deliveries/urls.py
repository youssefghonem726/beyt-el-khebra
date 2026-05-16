from django.urls import path
from .views import delivery_list

urlpatterns = [
    path("", delivery_list, name="delivery_list"),
]

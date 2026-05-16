from django.urls import path
from .views import batch_list

urlpatterns = [
    path("", batch_list, name="batch_list"),
]

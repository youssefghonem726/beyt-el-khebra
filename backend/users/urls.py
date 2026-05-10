from django.urls import path
from users.views import get_current_user

urlpatterns = [
    path("me/", get_current_user, name="get_current_user"),
]
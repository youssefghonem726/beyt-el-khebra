from django.urls import path
from users.views import get_current_user, clients_list_create

urlpatterns = [
    path("me/", get_current_user, name="get_current_user"),
    path("clients/", clients_list_create, name="clients_list_create"),
]

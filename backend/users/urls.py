from django.urls import path
from users.views import get_current_user, clients_list_create, update_current_user

urlpatterns = [
    path("me/", get_current_user, name="get_current_user"),
    path("me/update/", update_current_user, name="update_current_user"),   # new
    path("clients/", clients_list_create, name="clients_list_create"),
]
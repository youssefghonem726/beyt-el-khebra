from django.urls import path
from users.views import (
    get_current_user,
    update_current_user,
    clients_list_create,
    users_list,
    user_detail_update,
)

urlpatterns = [
    path("", users_list, name="users_list"),
    path("<int:user_id>/", user_detail_update, name="user_detail_update"),
    path("me/", get_current_user, name="get_current_user"),
    path("me/update/", update_current_user, name="update_current_user"),
    path("clients/", clients_list_create, name="clients_list_create"),
]
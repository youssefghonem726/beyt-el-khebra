from django.urls import path
from .views import (
    notification_list,
    notification_clear_read,
    notification_delete,
    notification_mark_all_read,
    notification_mark_read,
    notification_update,
)

urlpatterns = [
    path("", notification_list, name="notification_list"),
    path("read-all/", notification_mark_all_read, name="notification_mark_all_read"),
    path("read/", notification_clear_read, name="notification_clear_read"),
    path("<int:notification_id>/delete/", notification_delete, name="notification_delete"),
    path("<int:notification_id>/", notification_update, name="notification_update"),
    path("<int:notification_id>/read/", notification_mark_read, name="notification_mark_read"),
]

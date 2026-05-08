from django.urls import path
from uploads.views import uploads_list_create, upload_detail

urlpatterns = [
    path("", uploads_list_create, name="uploads_list_create"),
    path("<int:file_id>/", upload_detail, name="upload_detail"),
]
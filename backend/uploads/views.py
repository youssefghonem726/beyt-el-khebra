from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from uploads.models import File
from uploads.serializers import FileSerializer


def get_authenticated_user(request):
    user_data = getattr(request, "user_data", None)

    if not user_data:
        return None, error_response(
            message="Authentication required",
            errors={"detail": "Missing or invalid Supabase token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    supabase_uid = user_data.get("supabase_uid") or user_data.get("sub")

    if not supabase_uid:
        return None, error_response(
            message="Invalid token",
            errors={"detail": "Supabase user id not found in token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return None, error_response(
            message="User not found",
            errors={"detail": "No local user found for this Supabase account"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    return user, None


@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser])
def uploads_list_create(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if request.method == "GET":
        files = File.objects.filter(uploaded_by=user).order_by("-created_at")
        serializer = FileSerializer(files, many=True)

        return success_response(
            message="Files fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "POST":
        uploaded_file = request.FILES.get("file")
        file_type = request.data.get("file_type")

        if not uploaded_file:
            return error_response(
                message="Validation error",
                errors={"file": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        if not file_type:
            return error_response(
                message="Validation error",
                errors={"file_type": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        allowed_types = ["cover", "content", "preview", "package_image"]

        if file_type not in allowed_types:
            return error_response(
                message="Validation error",
                errors={"file_type": f"Invalid file_type. Allowed values: {allowed_types}"},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Save file to Django's default storage (Supabase storage bucket)
        file_path = default_storage.save(
            f"uploads/{uploaded_file.name}",
            ContentFile(uploaded_file.read())
        )
        file_url = default_storage.url(file_path)

        # Additional optional fields from request
        file_name = request.data.get("file_name", uploaded_file.name)
        mime_type = uploaded_file.content_type or None

        file_record = File.objects.create(
            url=file_url,
            file_type=file_type,
            uploaded_by=user,
            file_name=file_name,
            mime_type=mime_type,
            owner_id=user,           # Set owner to the uploading user
            reorder_count=0,
        )

        serializer = FileSerializer(file_record)

        return success_response(
            message="File uploaded successfully",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED
        )


@api_view(["GET", "DELETE", "PATCH"])
def upload_detail(request, file_id):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    try:
        file_record = File.objects.get(id=file_id, uploaded_by=user)
    except File.DoesNotExist:
        return error_response(
            message="File not found",
            errors={"detail": "No file found with this id for the authenticated user"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = FileSerializer(file_record)
        return success_response(
            message="File fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "DELETE":
        file_record.delete()
        return success_response(
            message="File deleted successfully",
            data={},
            status_code=status.HTTP_200_OK
        )

    if request.method == "PATCH":
        # Allow renaming and updating mime_type
        new_name = request.data.get("file_name")
        new_mime = request.data.get("mime_type")

        updated_fields = []
        if new_name is not None:
            file_record.file_name = new_name
            updated_fields.append("file_name")
        if new_mime is not None:
            file_record.mime_type = new_mime
            updated_fields.append("mime_type")

        if updated_fields:
            file_record.save(update_fields=updated_fields)

        serializer = FileSerializer(file_record)
        return success_response(
            message="File updated successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )
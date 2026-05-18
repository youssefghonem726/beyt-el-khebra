import uuid
from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from users.serializers import UserSerializer


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


def is_owner_or_staff(user):
    return user.role in ("owner", "staff")


@api_view(["GET"])
def get_current_user(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    serializer = UserSerializer(user)

    return success_response(
        message="Current user fetched successfully",
        data=serializer.data,
        status_code=status.HTTP_200_OK
    )


@api_view(["PATCH"])
def update_current_user(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    allowed_fields = {"first_name", "last_name", "email", "phone"}
    update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

    if not update_data:
        return error_response(
            message="Validation error",
            errors={"detail": "No valid fields provided."},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    serializer = UserSerializer(user, data=update_data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return success_response(
            message="Profile updated",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    return error_response(
        message="Validation error",
        errors=serializer.errors,
        status_code=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET"])
def users_list(request):
    requesting_user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if not is_owner_or_staff(requesting_user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can view users"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    users = User.objects.all().order_by("first_name", "last_name", "email")
    serializer = UserSerializer(users, many=True)

    return success_response(
        message="Users fetched successfully",
        data=serializer.data,
        status_code=status.HTTP_200_OK
    )


@api_view(["PATCH"])
def user_detail_update(request, user_id):
    requesting_user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if not is_owner_or_staff(requesting_user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can update users"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return error_response(
            message="User not found",
            errors={"detail": "No user found with this id"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    allowed_fields = {
        "first_name",
        "last_name",
        "email",
        "phone",
        "role",
        "is_active",
    }

    update_data = {
        key: value
        for key, value in request.data.items()
        if key in allowed_fields
    }

    if not update_data:
        return error_response(
            message="Validation error",
            errors={"detail": "No valid fields provided."},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    serializer = UserSerializer(target_user, data=update_data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return success_response(
            message="User updated successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    return error_response(
        message="Validation error",
        errors=serializer.errors,
        status_code=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET", "POST"])
def clients_list_create(request):
    requesting_user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if not is_owner_or_staff(requesting_user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can manage clients"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        clients = User.objects.filter(role="client", is_active=True).order_by(
            "first_name",
            "last_name",
            "email",
        )
        serializer = UserSerializer(clients, many=True)

        return success_response(
            message="Clients fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "POST":
        data = {
            "supabase_uid": f"pending-{uuid.uuid4()}",
            "first_name": request.data.get("first_name", ""),
            "last_name": request.data.get("last_name", ""),
            "email": request.data.get("email", ""),
            "phone": request.data.get("phone") or None,
            "role": "client",
            "is_active": True,
        }

        serializer = UserSerializer(data=data)

        if serializer.is_valid():
            serializer.save()

            return success_response(
                message="Client created successfully",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )

        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
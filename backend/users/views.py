from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from users.serializers import UserSerializer


@api_view(["GET"])
def get_current_user(request):
    user_data = getattr(request, "user_data", None)

    if not user_data:
        return error_response(
            message="Authentication required",
            errors={"detail": "Missing or invalid Supabase token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    supabase_uid = user_data.get("supabase_uid") or user_data.get("sub")

    if not supabase_uid:
        return error_response(
            message="Invalid token",
            errors={"detail": "Supabase user id not found in token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return error_response(
            message="User not found",
            errors={"detail": "No local user found for this Supabase account"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    serializer = UserSerializer(user)

    return success_response(
        message="Current user fetched successfully",
        data=serializer.data,
        status_code=status.HTTP_200_OK
    )
from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import Pricing
from .serializers import PricingSerializer
from users.views import get_authenticated_user


@api_view(["GET"])
def pricing_by_user(request, user_id):
    # Authentication
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Only owners/staff can view pricing
    if user.role not in ("owner", "staff"):
        return error_response("Forbidden", status_code=403)

    try:
        pricing = Pricing.objects.get(user_id=user_id)
    except Pricing.DoesNotExist:
        # Return a default pricing row (if exists) or an empty object
        default = Pricing.objects.filter(user__isnull=True).first()
        if default:
            serializer = PricingSerializer(default)
            return success_response("Default pricing", data=serializer.data)
        return success_response("No pricing found", data=None)

    serializer = PricingSerializer(pricing)
    return success_response("Pricing fetched", data=serializer.data)


@api_view(["PUT", "PATCH"])
def pricing_update(request, pk):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if user.role not in ("owner", "staff"):
        return error_response("Forbidden", status_code=403)

    try:
        pricing = Pricing.objects.get(pk=pk)
    except Pricing.DoesNotExist:
        return error_response("Pricing not found", status_code=404)

    serializer = PricingSerializer(
        pricing, data=request.data, partial=(request.method == "PATCH")
    )
    if serializer.is_valid():
        serializer.save()
        return success_response("Pricing updated", data=serializer.data)
    return error_response("Validation error", errors=serializer.errors, status_code=400)

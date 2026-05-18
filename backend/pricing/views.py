from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import Pricing
from .serializers import PricingSerializer
from users.views import get_authenticated_user


PRICING_FIELDS = [
    "front",
    "front_and_back",
    "digital_cover_300g",
    "digital_cover_200g",
    "offset_cover_200g",
    "offset_cover_300g",
    "coil_size_10",
    "coil_size_12",
    "coil_size_14",
    "coil_size_16",
    "coil_size_18",
    "coil_size_20",
    "coil_size_22",
    "coil_size_25",
    "coil_size_28",
    "coil_size_30",
    "coil_size_32",
    "coil_size_35",
]


def default_pricing_row():
    return Pricing.objects.filter(user__isnull=True).first()


@api_view(["GET", "PATCH"])
def pricing_by_user(request, user_id):
    # Authentication
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Only owners/staff can view pricing
    if user.role not in ("owner", "staff"):
        return error_response("Forbidden", status_code=403)

    if request.method == "GET":
        try:
            pricing = Pricing.objects.get(user_id=user_id)
            serializer = PricingSerializer(pricing)
            data = serializer.data
            data["source"] = "custom"
            return success_response("Pricing fetched", data=data)
        except Pricing.DoesNotExist:
            default = default_pricing_row()
            if default:
                serializer = PricingSerializer(default)
                data = serializer.data
                data["source"] = "default"
                return success_response("Default pricing", data=data)
            return success_response("No pricing found", data=None)

    try:
        pricing = Pricing.objects.get(user_id=user_id)
    except Pricing.DoesNotExist:
        default = default_pricing_row()
        defaults = {}
        if default:
            defaults = {field: getattr(default, field) for field in PRICING_FIELDS}

        pricing = Pricing.objects.create(user_id=user_id, **defaults)

    serializer = PricingSerializer(pricing, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(user_id=user_id)
        data = serializer.data
        data["source"] = "custom"
        return success_response("Custom pricing updated", data=data)

    return error_response("Validation error", errors=serializer.errors, status_code=400)


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

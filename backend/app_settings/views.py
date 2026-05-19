from rest_framework import status
from rest_framework.decorators import api_view

from core.responses import error_response, success_response
from users.views import get_authenticated_user

from .models import Setting
from .serializers import SettingSerializer

DEFAULT_SUPPORT_CONTACT = {
    "phone": "01206001616",
    "email": "betelkhebra2@gmail.com",
    "facebook_url": "https://www.facebook.com/share/18neEjKj21/",
    "messenger_name": "بيت الخبرة - Bayt El Khebra",
    "hours": "Contact shop for current working hours",
}


def _require_owner_or_staff(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return None, auth_error

    if user.role not in ("owner", "staff"):
        return None, error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can manage settings"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return user, None


def _upsert_setting(key, value):
    setting, _created = Setting.objects.update_or_create(
        key=key,
        defaults={"value": value},
    )
    return setting


@api_view(["GET"])
def settings_overview(request):
    _user, auth_error = _require_owner_or_staff(request)
    if auth_error:
        return auth_error

    settings = {row.key: row.value for row in Setting.objects.all()}

    return success_response(
        "Settings fetched",
        data={
            "pricing_roles": settings.get("pricing_roles", {}),
            "whatsapp": settings.get("whatsapp", {}),
            "support_contact": settings.get("support_contact", DEFAULT_SUPPORT_CONTACT),
        },
    )


@api_view(["GET"])
def support_contact(request):
    try:
        setting = Setting.objects.get(key="support_contact")
        data = {**DEFAULT_SUPPORT_CONTACT, **(setting.value or {})}
    except Setting.DoesNotExist:
        data = DEFAULT_SUPPORT_CONTACT

    return success_response("Support contact fetched", data=data)


@api_view(["GET"])
def settings_detail(request, key):
    _user, auth_error = _require_owner_or_staff(request)
    if auth_error:
        return auth_error

    try:
        setting = Setting.objects.get(key=key)
    except Setting.DoesNotExist:
        return error_response(
            message="Setting not found",
            errors={"detail": "No setting found with this key"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    serializer = SettingSerializer(setting)
    return success_response("Setting fetched", data=serializer.data)


@api_view(["PATCH"])
def update_pricing_roles(request):
    _user, auth_error = _require_owner_or_staff(request)
    if auth_error:
        return auth_error

    owner = request.data.get("owner")
    threshold = request.data.get("approval_threshold")

    if owner is None or threshold is None:
        return error_response(
            message="Validation error",
            errors={"detail": "owner and approval_threshold are required"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        threshold = float(threshold)
    except (TypeError, ValueError):
        return error_response(
            message="Validation error",
            errors={"approval_threshold": "Must be a number"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    setting = _upsert_setting(
        "pricing_roles",
        {
            "owner": str(owner),
            "approval_threshold": threshold,
        },
    )
    serializer = SettingSerializer(setting)
    return success_response("Pricing roles updated", data=serializer.data)


@api_view(["PATCH"])
def update_whatsapp(request):
    _user, auth_error = _require_owner_or_staff(request)
    if auth_error:
        return auth_error

    number = request.data.get("number")
    template = request.data.get("template")

    if number is None or template is None:
        return error_response(
            message="Validation error",
            errors={"detail": "number and template are required"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    setting = _upsert_setting(
        "whatsapp",
        {
            "number": str(number),
            "template": str(template),
        },
    )
    serializer = SettingSerializer(setting)
    return success_response("WhatsApp settings updated", data=serializer.data)

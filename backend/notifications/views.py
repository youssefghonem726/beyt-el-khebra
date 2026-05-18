from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import Notification
from .serializers import NotificationSerializer
from users.views import get_authenticated_user


@api_view(["GET"])
def notification_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if user.role in ("owner", "staff"):
        notifs = Notification.objects.all()
    else:
        notifs = Notification.objects.filter(user=user)

    serializer = NotificationSerializer(notifs, many=True)
    return success_response("Notifications fetched", data=serializer.data)


def _get_visible_notification(user, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        return None, error_response(
            message="Notification not found",
            errors={"detail": "No notification found with this id"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if user.role not in ("owner", "staff") and notification.user_id != user.id:
        return None, error_response(
            message="Forbidden",
            errors={"detail": "You cannot update this notification"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return notification, None


@api_view(["PATCH"])
def notification_update(request, notification_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    notification, lookup_error = _get_visible_notification(user, notification_id)
    if lookup_error:
        return lookup_error

    if "unread" in request.data:
        notification.unread = bool(request.data["unread"])
    elif "read" in request.data:
        notification.unread = not bool(request.data["read"])
    else:
        return error_response(
            message="Validation error",
            errors={"detail": "Provide read or unread."},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    notification.save(update_fields=["unread"])
    serializer = NotificationSerializer(notification)
    return success_response("Notification updated", data=serializer.data)


@api_view(["PATCH"])
def notification_mark_read(request, notification_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    notification, lookup_error = _get_visible_notification(user, notification_id)
    if lookup_error:
        return lookup_error

    notification.unread = False
    notification.save(update_fields=["unread"])
    serializer = NotificationSerializer(notification)
    return success_response("Notification marked as read", data=serializer.data)


@api_view(["PATCH"])
def notification_mark_all_read(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    queryset = Notification.objects.all()
    if user.role not in ("owner", "staff"):
        queryset = queryset.filter(user=user)

    updated_count = queryset.filter(unread=True).update(unread=False)

    return success_response(
        "Notifications marked as read",
        data={"success": True, "updated_count": updated_count},
    )


@api_view(["DELETE"])
def notification_delete(request, notification_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    notification, lookup_error = _get_visible_notification(user, notification_id)
    if lookup_error:
        return lookup_error

    notification.delete()
    return success_response(
        "Notification deleted",
        data={"success": True, "deleted_id": notification_id},
    )


@api_view(["DELETE"])
def notification_clear_read(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    queryset = Notification.objects.filter(unread=False)
    if user.role not in ("owner", "staff"):
        queryset = queryset.filter(user=user)

    deleted_count, _ = queryset.delete()

    return success_response(
        "Read notifications cleared",
        data={"success": True, "deleted_count": deleted_count},
    )

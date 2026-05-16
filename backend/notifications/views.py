from rest_framework.decorators import api_view
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

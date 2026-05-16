from rest_framework.decorators import api_view
from core.responses import success_response, error_response
from .models import Delivery
from .serializers import DeliverySerializer
from users.views import get_authenticated_user


@api_view(["GET"])
def delivery_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Owners/staff see all; clients see only their own deliveries
    if user.role in ("owner", "staff"):
        deliveries = Delivery.objects.all()
    else:
        deliveries = Delivery.objects.filter(client=user)

    serializer = DeliverySerializer(deliveries, many=True)
    return success_response("Deliveries fetched", data=serializer.data)

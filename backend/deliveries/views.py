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

@api_view(['GET'])
def delivery_detail(request, delivery_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        delivery = Delivery.objects.get(id=delivery_id)
    except Delivery.DoesNotExist:
        return error_response("Delivery not found", status_code=404)

    # Clients can only view their own deliveries
    if user.role not in ('owner', 'staff') and delivery.client_id != user.id:
        return error_response("Forbidden", status_code=403)

    serializer = DeliverySerializer(delivery)
    return success_response("Delivery fetched", data=serializer.data)
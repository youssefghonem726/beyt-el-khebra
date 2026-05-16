from rest_framework.decorators import api_view
from core.responses import success_response, error_response
from .models import Batch
from .serializers import BatchSerializer
from users.views import get_authenticated_user  # reuse the shared helper


@api_view(["GET"])
def batch_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Owners and staff see all batches
    if user.role in ("owner", "staff"):
        batches = Batch.objects.all()
    else:
        # Clients see batches only for their own orders
        batches = Batch.objects.filter(order__customer=user)

    serializer = BatchSerializer(batches, many=True)
    return success_response("Batches fetched", data=serializer.data)

from django.db.models import Q
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

    query = (request.GET.get("q") or "").strip()
    if query:
        numeric_query = query.replace("#", "")
        q_filter = (
            Q(product__icontains=query)
            | Q(status__icontains=query)
            | Q(order_items__order__customer__first_name__icontains=query)
            | Q(order_items__order__customer__last_name__icontains=query)
            | Q(order_items__order__customer__email__icontains=query)
            | Q(order_items__item_type__icontains=query)
            | Q(order__customer__first_name__icontains=query)
            | Q(order__customer__last_name__icontains=query)
            | Q(order__customer__email__icontains=query)
        )
        if numeric_query.isdigit():
            q_filter |= Q(id=int(numeric_query)) | Q(order_id=int(numeric_query)) | Q(order_items__order_id=int(numeric_query))
        batches = batches.filter(q_filter)

    batches = batches.select_related("order", "order__customer").prefetch_related(
        "stages",
        "order_items",
        "order_items__order",
        "order_items__order__customer",
    ).order_by("-created_at", "-id").distinct()
    serializer = BatchSerializer(batches, many=True)
    return success_response("Batches fetched", data=serializer.data)

@api_view(['GET', 'PATCH'])
def batch_detail(request, batch_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        batch = Batch.objects.get(id=batch_id)
    except Batch.DoesNotExist:
        return error_response("Batch not found", status_code=404)

    # Only staff/owner can edit
    if request.method == 'PATCH' and user.role not in ('owner', 'staff'):
        return error_response("Forbidden", status_code=403)

    if request.method == 'GET':
        serializer = BatchSerializer(batch)
        return success_response("Batch fetched", data=serializer.data)

    if request.method == 'PATCH':
        serializer = BatchSerializer(batch, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response("Batch updated", data=serializer.data)
        return error_response("Validation error", errors=serializer.errors, status_code=400)

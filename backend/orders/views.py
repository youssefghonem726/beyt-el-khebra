from rest_framework.decorators import api_view
from rest_framework import status
from django.db.models import Q
from django.utils import timezone

from core.responses import success_response, error_response
from users.models import User
from orders.models import Order, OrderItem, OrderStatusHistory
from orders.serializers import OrderSerializer
from notifications.services import create_notification, notify_owner_staff


def get_authenticated_user(request):
    user_data = getattr(request, "user_data", None)

    if not user_data:
        return None, error_response(
            message="Authentication required",
            errors={"detail": "Missing or invalid Supabase token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    supabase_uid = user_data.get("supabase_uid") or user_data.get("sub")

    if not supabase_uid:
        return None, error_response(
            message="Invalid token",
            errors={"detail": "Supabase user id not found in token"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return None, error_response(
            message="User not found",
            errors={"detail": "No local user found for this Supabase account"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    return user, None


PRODUCTION_ORDER_STATUSES = ["CONFIRMED", "IN_PROGRESS"]
PRODUCTION_ACTIVE_STEPS = ["pending", "design", "printing", "cutting", "packaging"]
PRODUCTION_STEPS = PRODUCTION_ACTIVE_STEPS + ["ready", "delivered"]


def is_owner_or_staff(user):
    return user.role in ("owner", "staff")


def order_client_name(order):
    first_name = (order.customer.first_name or "").strip()
    last_name = (order.customer.last_name or "").strip()
    full_name = f"{first_name} {last_name}".strip()
    return full_name or order.customer.email or "Unknown"


def production_status_for_step(step):
    if step == "pending":
        return "ready_for_production"
    if step in ("ready", "delivered"):
        return "completed"
    return "in_progress"


def serialize_production_item(item):
    quantity = item.quantity or 0
    completed_quantity = item.completed_quantity or 0
    progress = 0
    if quantity > 0:
        progress = int((completed_quantity / quantity) * 100)

    due_date = item.due_date or item.order.due_date

    return {
        "id": item.id,
        "job_id": f"JOB-{item.id}",
        "order_id": item.order_id,
        "order_status": item.order.status,
        "client_id": item.order.customer_id,
        "client_name": order_client_name(item.order),
        "client_email": item.order.customer.email,
        "product": item.item_type or "Order Item",
        "quantity": quantity,
        "completed_quantity": completed_quantity,
        "current_step": item.current_step,
        "status": production_status_for_step(item.current_step),
        "progress_percentage": progress,
        "due_date": due_date,
        "notes": item.notes or "",
        "unit_price": float(item.unit_price) if item.unit_price is not None else None,
        "total_price": float(item.total_price) if item.total_price is not None else None,
        "created_at": item.created_at,
    }


def sync_order_production_status(order):
    items = list(OrderItem.objects.filter(order_id=order.id))
    if not items:
        return

    old_status = order.status
    all_complete = all(
        item.current_step in ("ready", "delivered")
        for item in items
    )

    if all_complete:
        order.status = "COMPLETED"
        order.completed_at = order.completed_at or timezone.now()
        order.save(update_fields=["status", "completed_at"])
        if old_status != "COMPLETED":
            create_notification(
                order.customer,
                "Order completed",
                f"Your order #{order.id} is completed.",
                action_label="View orders",
                action_page="my-orders",
            )
    else:
        if order.status != "IN_PROGRESS":
            order.status = "IN_PROGRESS"
            order.save(update_fields=["status"])
            if old_status != "IN_PROGRESS":
                create_notification(
                    order.customer,
                    "Order in production",
                    f"Your order #{order.id} is now in production.",
                    action_label="View orders",
                    action_page="my-orders",
                )


@api_view(["GET", "POST"])
def orders_list_create(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if request.method == "GET":
        if user.role in ('owner', 'staff'):
            orders = Order.objects.all().order_by("-created_at")
        else:
            orders = Order.objects.filter(customer=user).order_by("-created_at")

        requested_status = request.query_params.get("status")
        search = request.query_params.get("q")

        if requested_status:
            orders = orders.filter(status=requested_status)

        if search:
            search_filter = (
                Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(customer__email__icontains=search)
            )
            if search.isdigit():
                search_filter |= Q(id=int(search))

            orders = orders.filter(search_filter)

        orders = orders.select_related("customer").prefetch_related(
            "order_items",
            "packages",
            "packages__items",
        )

        serializer = OrderSerializer(orders, many=True)

        return success_response(
            message="Orders fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "POST":
        data = request.data.copy()

        # Owners can place orders on behalf of a client by passing customer_id
        if user.role in ('owner', 'staff') and 'customer_id' in data:
            data["customer"] = data.pop("customer_id")
        else:
            data["customer"] = user.id

        serializer = OrderSerializer(data=data)

        if serializer.is_valid():
            order = serializer.save()

            notify_owner_staff(
                "New order placed",
                f"New order #{order.id} placed by {order_client_name(order)}.",
                action_label="Open unpriced queue",
                action_page="unpriced-queue",
            )

            return success_response(
                message="Order created successfully",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )

        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
def production_jobs(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if not is_owner_or_staff(user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can view production jobs"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    jobs = OrderItem.objects.select_related("order", "order__customer").filter(
        order__status__in=PRODUCTION_ORDER_STATUSES,
        current_step__in=PRODUCTION_STEPS,
    ).order_by("due_date", "created_at", "id")

    requested_step = request.query_params.get("step")
    search = request.query_params.get("q")

    if requested_step:
        jobs = jobs.filter(current_step=requested_step)

    if search:
        search_filter = (
            Q(item_type__icontains=search)
            | Q(order__customer__first_name__icontains=search)
            | Q(order__customer__last_name__icontains=search)
            | Q(order__customer__email__icontains=search)
        )
        if search.isdigit():
            search_filter |= Q(id=int(search)) | Q(order_id=int(search))

        jobs = jobs.filter(search_filter)

    return success_response(
        message="Production jobs fetched successfully",
        data=[serialize_production_item(item) for item in jobs],
        status_code=status.HTTP_200_OK
    )


@api_view(["PATCH"])
def update_production_job(request, item_id):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if not is_owner_or_staff(user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can update production jobs"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    try:
        item = OrderItem.objects.select_related("order", "order__customer").get(
            id=item_id,
            order__status__in=PRODUCTION_ORDER_STATUSES,
        )
    except OrderItem.DoesNotExist:
        return error_response(
            message="Production job not found",
            errors={"detail": "No production job found with this id"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    current_step = request.data.get("current_step")
    completed_quantity = request.data.get("completed_quantity")

    update_fields = []

    if current_step is not None:
        if current_step not in PRODUCTION_STEPS:
            return error_response(
                message="Validation error",
                errors={"current_step": "Invalid production step."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        item.current_step = current_step
        update_fields.append("current_step")

        if current_step in ("ready", "delivered"):
            item.completed_quantity = item.quantity or item.completed_quantity
            if "completed_quantity" not in update_fields:
                update_fields.append("completed_quantity")

    if completed_quantity is not None:
        try:
            completed_quantity = int(completed_quantity)
        except (TypeError, ValueError):
            return error_response(
                message="Validation error",
                errors={"completed_quantity": "Enter a valid quantity."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        if completed_quantity < 0 or completed_quantity > (item.quantity or 0):
            return error_response(
                message="Validation error",
                errors={"completed_quantity": "Completed quantity must be between 0 and the job quantity."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        item.completed_quantity = completed_quantity
        if "completed_quantity" not in update_fields:
            update_fields.append("completed_quantity")

    if not update_fields:
        return error_response(
            message="Validation error",
            errors={"detail": "No valid production fields provided."},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    item.save(update_fields=update_fields)
    sync_order_production_status(item.order)
    item.refresh_from_db()
    item.order.refresh_from_db()

    return success_response(
        message="Production job updated successfully",
        data=serialize_production_item(item),
        status_code=status.HTTP_200_OK
    )

@api_view(["GET", "PUT", "PATCH", "DELETE"])
def order_detail(request, order_id):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    try:
        # Owners and staff can access any order
        if user.role in ('owner', 'staff'):
            order = Order.objects.get(id=order_id)
        else:
            order = Order.objects.get(id=order_id, customer=user)
    except Order.DoesNotExist:
        return error_response(
            message="Order not found",
            errors={"detail": "No order found with this id for the authenticated user"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = OrderSerializer(order)

        return success_response(
            message="Order fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method in ["PUT", "PATCH"]:
        data = request.data.copy()
        old_status = order.status
        if user.role in ("owner", "staff"):
            data["customer"] = order.customer_id
        else:
            data["customer"] = user.id

        serializer = OrderSerializer(
            order,
            data=data,
            partial=(request.method == "PATCH")
        )

        if serializer.is_valid():
            order = serializer.save()

            if old_status != order.status:
                OrderStatusHistory.objects.create(
                    order=order,
                    updated_by=user,
                    old_status=old_status,
                    new_status=order.status,
                    notes="Order cancelled from owner queue" if order.status == "CANCELLED" else "Order status updated",
                )

            return success_response(
                message="Order updated successfully",
                data=serializer.data,
                status_code=status.HTTP_200_OK
            )

        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    if request.method == "DELETE":
        order.delete()

        return success_response(
            message="Order deleted successfully",
            data={},
            status_code=status.HTTP_200_OK
        )

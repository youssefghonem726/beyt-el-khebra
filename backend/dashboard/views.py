from decimal import Decimal

from django.db.models import Sum
from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from orders.models import Order, OrderItem, OrderStatusHistory
from quotes.models import Quote


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


def decimal_to_float(value):
    if value is None:
        return 0

    if isinstance(value, Decimal):
        return float(value)

    return value


@api_view(["GET"])
def dashboard_stats(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if user.role not in ["owner", "staff"]:
        return error_response(
            message="Permission denied",
            errors={"detail": "Only owner or staff users can access dashboard statistics"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    total_orders = Order.objects.count()
    unpriced_orders = Order.objects.filter(status="UNPRICED_PENDING").count()
    confirmed_orders = Order.objects.filter(status="CONFIRMED").count()
    in_progress_orders = Order.objects.filter(status="IN_PROGRESS").count()
    completed_orders = Order.objects.filter(status="COMPLETED").count()
    cancelled_orders = Order.objects.filter(status="CANCELLED").count()

    accounting_orders = Order.objects.filter(
        status__in=[
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
        ],
        total_price__isnull=False,
        total_price__gt=0,
    )
    total_order_value = accounting_orders.aggregate(total=Sum("total_price"))["total"] or Decimal("0")
    total_paid_amount = accounting_orders.aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")
    total_remaining_amount = max(total_order_value - total_paid_amount, Decimal("0"))

    unpaid_orders = accounting_orders.exclude(payment_status="paid").count()
    partial_paid_orders = accounting_orders.filter(payment_status="partial").count()
    paid_orders = accounting_orders.filter(payment_status="paid").count()

    production_order_statuses = ["CONFIRMED", "IN_PROGRESS"]
    active_production_steps = ["pending", "design", "printing", "cutting", "packaging"]
    production_items = OrderItem.objects.filter(
        order__status__in=production_order_statuses,
        current_step__in=active_production_steps,
    )
    total_items = production_items.count()
    total_quantity = production_items.aggregate(total=Sum("quantity"))["total"] or 0
    total_completed_quantity = production_items.aggregate(total=Sum("completed_quantity"))["total"] or 0

    if total_quantity == 0:
        overall_progress_percentage = 0
    else:
        overall_progress_percentage = int((total_completed_quantity / total_quantity) * 100)

    items_in_printing = OrderItem.objects.filter(
        order__status__in=production_order_statuses,
        current_step="printing",
    ).count()
    items_in_packaging = OrderItem.objects.filter(
        order__status__in=production_order_statuses,
        current_step="packaging",
    ).count()
    items_ready = OrderItem.objects.filter(
        order__status__in=["IN_PROGRESS", "COMPLETED"],
        current_step="ready",
    ).count()

    total_quotes = Quote.objects.count()
    pending_quotes = Quote.objects.filter(status="pending").count()
    approved_quotes = Quote.objects.filter(status="approved").count()
    rejected_quotes = Quote.objects.filter(status="rejected").count()

    latest_orders = list(
        Order.objects.order_by("-created_at").values(
            "id",
            "status",
            "total_price",
            "payment_status",
            "paid_amount",
            "created_at",
        )[:5]
    )

    latest_quotes = list(
        Quote.objects.order_by("-created_at").values(
            "id",
            "status",
            "total_estimated_price",
            "created_at",
        )[:5]
    )

    latest_status_updates = list(
        OrderStatusHistory.objects.order_by("-created_at").values(
            "id",
            "order_id",
            "old_status",
            "new_status",
            "notes",
            "created_at",
        )[:5]
    )

    data = {
        "orders": {
            "total_orders": total_orders,
            "unpriced_orders": unpriced_orders,
            "confirmed_orders": confirmed_orders,
            "in_progress_orders": in_progress_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
        },
        "payments": {
            "total_order_value": decimal_to_float(total_order_value),
            "total_paid_amount": decimal_to_float(total_paid_amount),
            "total_remaining_amount": decimal_to_float(total_remaining_amount),
            "unpaid_orders": unpaid_orders,
            "partial_paid_orders": partial_paid_orders,
            "paid_orders": paid_orders,
        },
        "production": {
            "total_items": total_items,
            "total_quantity": total_quantity,
            "total_completed_quantity": total_completed_quantity,
            "overall_progress_percentage": overall_progress_percentage,
            "items_in_printing": items_in_printing,
            "items_in_packaging": items_in_packaging,
            "items_ready": items_ready,
        },
        "quotes": {
            "total_quotes": total_quotes,
            "pending_quotes": pending_quotes,
            "approved_quotes": approved_quotes,
            "rejected_quotes": rejected_quotes,
        },
        "recent_activity": {
            "latest_orders": latest_orders,
            "latest_quotes": latest_quotes,
            "latest_status_updates": latest_status_updates,
        }
    }

    return success_response(
        message="Dashboard statistics fetched successfully",
        data=data,
        status_code=status.HTTP_200_OK
    )

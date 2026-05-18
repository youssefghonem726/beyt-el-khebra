from rest_framework.decorators import api_view
from rest_framework import status
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from datetime import datetime, time

from core.responses import success_response, error_response
from .models import Delivery
from .serializers import DeliverySerializer
from orders.models import Order
from orders.serializers import OrderSerializer
from users.views import get_authenticated_user
from notifications.services import create_notification


DELIVERY_STATUSES = {
    "pending": 0,
    "out_for_delivery": 50,
    "delivered": 100,
    "delayed": 50,
    "lost": 0,
}


def parse_scheduled_date(value):
    if not value:
        return None

    parsed = parse_datetime(value)
    if parsed is None:
        parsed_date = parse_date(value)
        if parsed_date is not None:
            parsed = datetime.combine(parsed_date, time.min)

    if parsed is not None and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())

    return parsed


def is_owner_or_staff(user):
    return user.role in ("owner", "staff")


def visible_deliveries_for_user(user):
    deliveries = Delivery.objects.select_related("order", "client")

    if is_owner_or_staff(user):
        return deliveries.all()

    return deliveries.filter(client=user)


def delivery_ready_orders_for_user(user):
    orders = Order.objects.select_related("customer").prefetch_related(
        "order_items",
        "packages",
        "packages__items",
    ).filter(status="COMPLETED").filter(deliveries__isnull=True)

    if not is_owner_or_staff(user):
        orders = orders.filter(customer=user)

    return orders.order_by("-completed_at", "-created_at")


@api_view(["GET", "POST"])
def delivery_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if request.method == "GET":
        deliveries = visible_deliveries_for_user(user)

        search = request.query_params.get("q")
        requested_status = request.query_params.get("status")

        if requested_status:
            deliveries = deliveries.filter(status=requested_status)

        if search:
            search_filter = (
                Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(client__email__icontains=search)
                | Q(status__icontains=search)
                | Q(driver__icontains=search)
                | Q(company__icontains=search)
            )

            if search.isdigit():
                search_filter |= Q(order_id=int(search)) | Q(id=int(search))

            deliveries = deliveries.filter(search_filter)

        serializer = DeliverySerializer(deliveries, many=True)
        return success_response("Deliveries fetched", data=serializer.data)

    if not is_owner_or_staff(user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can create deliveries"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    order_id = request.data.get("order_id") or request.data.get("orderId")

    try:
        order = Order.objects.select_related("customer").get(id=order_id)
    except (Order.DoesNotExist, TypeError, ValueError):
        return error_response(
            message="Order not found",
            errors={"detail": "No order found with this id"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    if order.status != "COMPLETED":
        return error_response(
            message="Order is not delivery-ready",
            errors={"detail": "Only completed orders can have delivery created"},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    if Delivery.objects.filter(order=order).exists():
        return error_response(
            message="Delivery already exists",
            errors={"detail": "This order already has a delivery record"},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    delivery = Delivery.objects.create(
        order=order,
        client=order.customer,
        address=(request.data.get("address") or "Address missing").strip(),
        driver=(request.data.get("driver") or "Unassigned").strip(),
        company=(request.data.get("company") or "").strip(),
        phone=(request.data.get("phone") or order.customer.phone or "").strip(),
        notes=(request.data.get("notes") or "").strip(),
        status="pending",
        progress=0,
        scheduled_date=parse_scheduled_date(
            request.data.get("scheduled_date") or request.data.get("scheduledDate")
        ) or order.due_date,
    )

    create_notification(
        order.customer,
        "Delivery created",
        f"Delivery was created for Order #{order.id}.",
        action_label="View delivery",
        action_page="my-orders",
    )

    serializer = DeliverySerializer(delivery)
    return success_response(
        "Delivery created",
        data=serializer.data,
        status_code=status.HTTP_201_CREATED
    )


@api_view(["GET"])
def delivery_ready_orders(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if not is_owner_or_staff(user):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owners and staff can view delivery-ready orders"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    serializer = OrderSerializer(delivery_ready_orders_for_user(user), many=True)
    return success_response("Delivery-ready orders fetched", data=serializer.data)


@api_view(["GET", "PATCH"])
def delivery_detail(request, delivery_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        delivery = Delivery.objects.select_related("order", "client").get(id=delivery_id)
    except Delivery.DoesNotExist:
        return error_response("Delivery not found", status_code=404)

    # Clients can only view their own deliveries
    if not is_owner_or_staff(user) and delivery.client_id != user.id:
        return error_response("Forbidden", status_code=403)

    if request.method == "PATCH":
        if not is_owner_or_staff(user):
            return error_response(
                message="Forbidden",
                errors={"detail": "Only owners and staff can update deliveries"},
                status_code=status.HTTP_403_FORBIDDEN
            )

        old_status = delivery.status
        new_status = request.data.get("status")
        address = request.data.get("address")
        driver = request.data.get("driver")
        company = request.data.get("company")
        phone = request.data.get("phone")
        notes = request.data.get("notes")
        scheduled_date = request.data.get("scheduled_date") or request.data.get("scheduledDate")
        update_fields = []

        if new_status is not None:
            if new_status not in DELIVERY_STATUSES:
                return error_response(
                    message="Validation error",
                    errors={"status": "Invalid delivery status."},
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            delivery.status = new_status
            delivery.progress = DELIVERY_STATUSES[new_status]
            update_fields.extend(["status", "progress"])

            if new_status == "delivered" and delivery.delivered_at is None:
                delivery.delivered_at = timezone.now()
                update_fields.append("delivered_at")

        if address is not None:
            delivery.address = address.strip() or "Address missing"
            update_fields.append("address")

        if driver is not None:
            delivery.driver = driver.strip() or "Unassigned"
            update_fields.append("driver")

        if company is not None:
            delivery.company = company.strip()
            update_fields.append("company")

        if phone is not None:
            delivery.phone = phone.strip()
            update_fields.append("phone")

        if notes is not None:
            delivery.notes = notes.strip()
            update_fields.append("notes")

        if scheduled_date is not None:
            delivery.scheduled_date = parse_scheduled_date(scheduled_date)
            update_fields.append("scheduled_date")

        if not update_fields:
            return error_response(
                message="Validation error",
                errors={"detail": "No valid delivery fields provided."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        delivery.updated_at = timezone.now()
        update_fields.append("updated_at")
        delivery.save(update_fields=list(set(update_fields)))

        if new_status is not None and old_status != delivery.status:
            create_notification(
                delivery.client,
                "Delivery updated",
                f"Delivery for Order #{delivery.order_id} is now {delivery.status.replace('_', ' ')}.",
                action_label="View delivery",
                action_page="my-orders",
            )

    serializer = DeliverySerializer(delivery)
    return success_response("Delivery fetched", data=serializer.data)

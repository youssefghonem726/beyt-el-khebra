from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import Invoice
from .serializers import InvoiceSerializer
from orders.models import Order
from users.views import get_authenticated_user   # reuse the helper


INVOICE_READY_STATUSES = [
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
]


def decimal_to_float(value):
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return float(value)
    return value


def order_client_name(order):
    full_name = f"{order.customer.first_name or ''} {order.customer.last_name or ''}".strip()
    return full_name or order.customer.email or "Unknown"


def invoice_status_for_order(order):
    return order.status

@api_view(['GET'])
def invoice_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Role-based filtering
    if user.role == 'owner' or user.role == 'staff':
        invoices = Invoice.objects.select_related("order", "client").prefetch_related(
            "order__order_items"
        ).all().order_by("-created_at")
    else:
        # Clients see only their own invoices
        invoices = Invoice.objects.select_related("order", "client").prefetch_related(
            "order__order_items"
        ).filter(client=user).order_by("-created_at")

    serializer = InvoiceSerializer(invoices, many=True)
    return success_response("Invoices fetched", data=serializer.data)


@api_view(['GET'])
def accounting_overview(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if user.role not in ('owner', 'staff'):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owner and staff users can view accounting overview"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    billable_orders = Order.objects.select_related("customer").filter(
        status__in=INVOICE_READY_STATUSES,
        total_price__isnull=False,
        total_price__gt=0,
    )
    total_order_value = billable_orders.aggregate(total=Sum("total_price"))["total"] or Decimal("0")
    total_paid_amount = billable_orders.aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")
    total_remaining_amount = max(total_order_value - total_paid_amount, Decimal("0"))

    paid_orders = billable_orders.filter(payment_status="paid").count()
    partial_paid_orders = billable_orders.filter(payment_status="partial").count()
    unpaid_orders = billable_orders.exclude(payment_status="paid").count()

    invoices = Invoice.objects.select_related("order", "client").prefetch_related(
        "order__order_items"
    ).all().order_by("-created_at")
    invoice_order_ids = set(invoices.exclude(order_id__isnull=True).values_list("order_id", flat=True))
    invoice_candidates = [
        {
            "order_id": order.id,
            "client_id": order.customer_id,
            "client_name": order_client_name(order),
            "total": decimal_to_float(order.total_price),
            "paid_amount": decimal_to_float(order.paid_amount),
            "remaining_amount": decimal_to_float(order.remaining_amount),
            "payment_status": order.payment_status,
            "status": order.status,
            "created_at": order.created_at,
        }
        for order in billable_orders.exclude(id__in=invoice_order_ids).order_by("-created_at")
    ]

    client_summary = {}
    for order in billable_orders:
        key = str(order.customer_id)
        if key not in client_summary:
            client_summary[key] = {
                "client_id": order.customer_id,
                "client_name": order_client_name(order),
                "orders": 0,
                "total": 0,
                "paid": 0,
                "unpaid": 0,
            }

        client_summary[key]["orders"] += 1
        client_summary[key]["total"] += decimal_to_float(order.total_price)
        client_summary[key]["paid"] += decimal_to_float(order.paid_amount)
        client_summary[key]["unpaid"] += decimal_to_float(order.remaining_amount)

    data = {
        "stats": {
            "revenue_snapshot": decimal_to_float(total_paid_amount),
            "pending_collection": decimal_to_float(total_remaining_amount),
            "paid_orders": paid_orders,
            "partial_paid_orders": partial_paid_orders,
            "unpaid_orders": unpaid_orders,
            "invoice_count": invoices.count(),
        },
        "invoices": InvoiceSerializer(invoices, many=True).data,
        "invoice_candidates": invoice_candidates,
        "client_summary": list(client_summary.values()),
    }

    return success_response("Accounting overview fetched successfully", data=data)


@api_view(['POST'])
def generate_invoice(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if user.role not in ('owner', 'staff'):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owner and staff users can generate invoices"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    order_id = request.data.get("order_id")
    if not order_id:
        return error_response(
            message="Validation error",
            errors={"order_id": "This field is required."},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.select_related("customer").get(id=order_id)
    except Order.DoesNotExist:
        return error_response(
            message="Order not found",
            errors={"detail": "No order found with this id"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if order.status not in INVOICE_READY_STATUSES or not order.total_price:
        return error_response(
            message="Order is not invoice-ready",
            errors={"detail": "Order must be confirmed, in progress, or completed before generating an invoice."},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    invoice, _created = Invoice.objects.get_or_create(
        order=order,
        defaults={
            "client": order.customer,
            "due_date": request.data.get("due_date") or timezone.localdate(),
            "total_amount": float(order.total_price),
            "status": invoice_status_for_order(order),
            "notes": request.data.get("notes") or "",
        },
    )

    serializer = InvoiceSerializer(invoice)
    return success_response("Invoice generated successfully", data=serializer.data)


@api_view(['POST'])
def pay_invoice(request, invoice_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    if user.role not in ('owner', 'staff'):
        return error_response(
            message="Forbidden",
            errors={"detail": "Only owner and staff users can record payments"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    try:
        invoice = Invoice.objects.select_related("order", "client").get(id=invoice_id)
    except Invoice.DoesNotExist:
        return error_response(
            message="Invoice not found",
            errors={"detail": "No invoice found with this id"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if not invoice.order:
        return error_response(
            message="Invoice has no linked order",
            errors={"detail": "Payments are recorded against linked orders."},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    order = invoice.order
    total = order.total_price or Decimal(str(invoice.total_amount or 0))
    requested_amount = request.data.get("amount")
    mark_full = request.data.get("mark_full", requested_amount is None)

    if mark_full:
        paid_amount = total
    else:
        try:
            payment_amount = Decimal(str(requested_amount))
        except Exception:
            return error_response(
                message="Validation error",
                errors={"amount": "Enter a valid payment amount."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        current_paid = order.paid_amount or Decimal("0")
        remaining_amount = max(total - current_paid, Decimal("0"))

        if payment_amount <= 0:
            return error_response(
                message="Validation error",
                errors={"amount": "Payment amount must be greater than 0."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if payment_amount > remaining_amount:
            return error_response(
                message="Validation error",
                errors={"amount": "Payment amount cannot be greater than the remaining balance."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        paid_amount = current_paid + payment_amount

    order.paid_amount = paid_amount
    if paid_amount >= total:
        order.payment_status = "paid"
        invoice.paid_date = timezone.localdate()
    elif paid_amount > 0:
        order.payment_status = "partial"
        invoice.paid_date = None
    else:
        order.payment_status = "unpaid"
        invoice.paid_date = None

    order.save(update_fields=["paid_amount", "payment_status"])
    invoice.total_amount = float(total)
    invoice.save(update_fields=["paid_date", "total_amount"])

    serializer = InvoiceSerializer(invoice)
    return success_response("Payment recorded successfully", data=serializer.data)

@api_view(['GET'])
def invoice_detail(request, invoice_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        invoice = Invoice.objects.select_related("order", "client").prefetch_related(
            "order__order_items"
        ).get(id=invoice_id)
    except Invoice.DoesNotExist:
        return error_response(
            message="Invoice not found",
            errors={"detail": "No invoice found with this id"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    # Clients can only view their own invoices
    if user.role not in ('owner', 'staff') and invoice.client_id != user.id:
        return error_response(
            message="Forbidden",
            errors={"detail": "You do not have permission to view this invoice"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    serializer = InvoiceSerializer(invoice)
    return success_response(
        message="Invoice fetched successfully",
        data=serializer.data,
        status_code=status.HTTP_200_OK
    )

from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from orders.models import Order, OrderStatusHistory
from quotes.models import Quote
from quotes.serializers import QuoteSerializer, QuoteCreateSerializer
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


@api_view(["GET", "POST"])
def quotes_list_create(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if request.method == "GET":
        if user.role in ("owner", "staff"):
            quotes = Quote.objects.all().order_by("-created_at")
        else:
            quotes = Quote.objects.filter(customer=user).order_by("-created_at")
        serializer = QuoteSerializer(quotes, many=True)

        return success_response(
            message="Quotes fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "POST":
        serializer = QuoteCreateSerializer(
            data=request.data,
            context={"customer": user}
        )

        if serializer.is_valid():
            quote = serializer.save()

            order = quote.order
            old_status = order.status
            order.status = "PRICED_PENDING_CONFIRMATION"
            if quote.total_estimated_price is not None:
                order.total_price = quote.total_estimated_price
            order.save(update_fields=["status", "total_price"])

            order_items = list(order.order_items.all().order_by("id"))
            quote_items = list(quote.items.all().order_by("id"))
            for index, quote_item in enumerate(quote_items):
                if index >= len(order_items):
                    break

                order_item = order_items[index]
                order_item.unit_price = quote_item.estimated_unit_price
                order_item.total_price = quote_item.estimated_total_price
                order_item.save(update_fields=["unit_price", "total_price"])

            OrderStatusHistory.objects.create(
                order=order,
                updated_by=user,
                old_status=old_status,
                new_status=order.status,
                notes="Quote created",
            )

            create_notification(
                order.customer,
                "Quote ready",
                f"Your quote is ready for Order #{order.id}.",
                action_label="View quote",
                action_page="quotes",
            )

            response_serializer = QuoteSerializer(quote)

            return success_response(
                message="Quote created successfully",
                data=response_serializer.data,
                status_code=status.HTTP_201_CREATED
            )

        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET", "PATCH", "DELETE"])
def quote_detail(request, quote_id):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    try:
        if user.role in ("owner", "staff"):
            quote = Quote.objects.get(id=quote_id)
        else:
            quote = Quote.objects.get(id=quote_id, customer=user)
    except Quote.DoesNotExist:
        return error_response(
            message="Quote not found",
            errors={"detail": "No quote found with this id for the authenticated user"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = QuoteSerializer(quote)

        return success_response(
            message="Quote fetched successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    if request.method == "PATCH":
        serializer = QuoteCreateSerializer(
            quote,
            data=request.data,
            partial=True,
            context={"customer": user}
        )

        if serializer.is_valid():
            quote = serializer.save()
            response_serializer = QuoteSerializer(quote)

            return success_response(
                message="Quote updated successfully",
                data=response_serializer.data,
                status_code=status.HTTP_200_OK
            )

        return error_response(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    if request.method == "DELETE":
        quote.delete()

        return success_response(
            message="Quote deleted successfully",
            data={},
            status_code=status.HTTP_200_OK
        )


@api_view(["POST"])
def quote_approve(request, quote_id):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    try:
        if user.role in ("owner", "staff"):
            quote = Quote.objects.select_related("order", "customer").get(id=quote_id)
        else:
            quote = Quote.objects.select_related("order", "customer").get(id=quote_id, customer=user)
    except Quote.DoesNotExist:
        return error_response(
            message="Quote not found",
            errors={"detail": "No quote found with this id for the authenticated user"},
            status_code=status.HTTP_404_NOT_FOUND
        )

    order = quote.order
    if user.role == "client" and order.customer_id != user.id:
        return error_response(
            message="Forbidden",
            errors={"detail": "You can only approve quotes for your own orders"},
            status_code=status.HTTP_403_FORBIDDEN
        )

    old_status = order.status
    quote.status = "approved"
    quote.save(update_fields=["status"])

    order.status = "CONFIRMED"
    order.save(update_fields=["status"])

    if old_status != order.status:
        OrderStatusHistory.objects.create(
            order=order,
            updated_by=user,
            old_status=old_status,
            new_status=order.status,
            notes="Quote approved",
        )

    notify_owner_staff(
        "Quote approved",
        f"Quote approved for Order #{order.id}.",
        action_label="Open order",
        action_page="owner-dashboard",
    )

    return success_response(
        message="Quote approved successfully",
        data={
            "id": quote.id,
            "status": quote.status,
            "order_id": order.id,
            "order_status": order.status,
        },
        status_code=status.HTTP_200_OK
    )


@api_view(["POST"])
def quote_confirm(request, quote_id):
    return quote_approve(request, quote_id)

from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from orders.models import Order
from quotes.models import Quote
from quotes.serializers import QuoteSerializer, QuoteCreateSerializer


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

            # update order status so it leaves the unpriced queue
            Order.objects.filter(id=quote.order_id).update(status="PRICED_PENDING_CONFIRMATION")

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
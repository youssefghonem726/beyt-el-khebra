from rest_framework.decorators import api_view
from rest_framework import status

from core.responses import success_response, error_response
from users.models import User
from orders.models import Order
from orders.serializers import OrderSerializer


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
def orders_list_create(request):
    user, auth_error = get_authenticated_user(request)

    if auth_error:
        return auth_error

    if request.method == "GET":
        if user.role in ('owner', 'staff'):
            orders = Order.objects.all().order_by("-created_at")
        else:
            orders = Order.objects.filter(customer=user).order_by("-created_at")
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
            serializer.save()

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
        data["customer"] = user.id

        serializer = OrderSerializer(
            order,
            data=data,
            partial=(request.method == "PATCH")
        )

        if serializer.is_valid():
            serializer.save()

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
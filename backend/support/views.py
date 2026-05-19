from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import SupportTicket
from .serializers import SupportTicketSerializer
from users.views import get_authenticated_user
from notifications.services import notify_owner_staff

@api_view(['POST'])
def create_support_ticket(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    serializer = SupportTicketSerializer(data=request.data)
    if serializer.is_valid():
        ticket = serializer.save(user=user, status='open')
        client_name = f"{user.first_name} {user.last_name}".strip() or user.email
        notify_owner_staff(
            "New support ticket",
            f"Support ticket from {client_name}: {ticket.subject}",
            action_label="Review support",
            action_page="owner-dashboard",
        )
        return success_response(
            message="Ticket created",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED
        )
    return error_response(
        message="Validation error",
        errors=serializer.errors,
        status_code=status.HTTP_400_BAD_REQUEST
    )

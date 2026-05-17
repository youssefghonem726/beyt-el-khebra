from rest_framework.decorators import api_view
from rest_framework import status
from core.responses import success_response, error_response
from .models import Invoice
from .serializers import InvoiceSerializer
from users.views import get_authenticated_user   # reuse the helper

@api_view(['GET'])
def invoice_list(request):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    # Role-based filtering
    if user.role == 'owner' or user.role == 'staff':
        invoices = Invoice.objects.all()
    else:
        # Clients see only their own invoices
        invoices = Invoice.objects.filter(client=user)

    serializer = InvoiceSerializer(invoices, many=True)
    return success_response("Invoices fetched", data=serializer.data)

@api_view(['GET'])
def invoice_detail(request, invoice_id):
    user, auth_error = get_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        invoice = Invoice.objects.get(id=invoice_id)
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
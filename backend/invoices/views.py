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
from django.urls import path
from .views import invoice_list, invoice_detail, accounting_overview, generate_invoice, pay_invoice

urlpatterns = [
    path('accounting/', accounting_overview, name='accounting_overview'),
    path('generate/', generate_invoice, name='generate_invoice'),
    path('<int:invoice_id>/pay/', pay_invoice, name='pay_invoice'),
    path('', invoice_list, name='invoice_list'),
    path('<int:invoice_id>/', invoice_detail, name='invoice_detail'),
]

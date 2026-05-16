from django.urls import path
from .views import invoice_list

urlpatterns = [
    path('', invoice_list, name='invoice_list'),
]
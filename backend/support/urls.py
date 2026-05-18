from django.urls import path
from .views import create_support_ticket

urlpatterns = [
    path('', create_support_ticket, name='create_support_ticket'),
]
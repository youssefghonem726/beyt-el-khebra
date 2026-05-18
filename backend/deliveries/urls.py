from django.urls import path
from .views import delivery_list, delivery_detail, delivery_ready_orders

urlpatterns = [
    path('', delivery_list, name='delivery_list'),
    path('ready-orders/', delivery_ready_orders, name='delivery_ready_orders'),
    path('<int:delivery_id>/', delivery_detail, name='delivery_detail'),
]

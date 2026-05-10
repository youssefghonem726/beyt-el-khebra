from django.urls import path
from orders.views import orders_list_create, order_detail

urlpatterns = [
    path("", orders_list_create, name="orders_list_create"),
    path("<int:order_id>/", order_detail, name="order_detail"),
]
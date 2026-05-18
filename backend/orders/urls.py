from django.urls import path
from orders.views import orders_list_create, order_detail, production_jobs, update_production_job

urlpatterns = [
    path("", orders_list_create, name="orders_list_create"),
    path("production/", production_jobs, name="production_jobs"),
    path("production-items/<int:item_id>/", update_production_job, name="update_production_job"),
    path("<int:order_id>/", order_detail, name="order_detail"),
]

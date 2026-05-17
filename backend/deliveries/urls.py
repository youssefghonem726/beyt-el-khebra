from django.urls import path
from .views import delivery_list, delivery_detail

urlpatterns = [
    path('', delivery_list, name='delivery_list'),
    path('<int:delivery_id>/', delivery_detail, name='delivery_detail'),
]
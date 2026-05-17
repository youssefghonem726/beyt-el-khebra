from django.urls import path
from .views import batch_list, batch_detail

urlpatterns = [
    path('', batch_list, name='batch_list'),
    path('<int:batch_id>/', batch_detail, name='batch_detail'),
]
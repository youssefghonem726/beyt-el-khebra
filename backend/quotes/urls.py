from django.urls import path
from quotes.views import quotes_list_create, quote_detail

urlpatterns = [
    path("", quotes_list_create, name="quotes_list_create"),
    path("<int:quote_id>/", quote_detail, name="quote_detail"),
]
from django.urls import path
from quotes.views import (
    quotes_list_create,
    quote_detail,
    quote_approve,
    quote_confirm,
    quote_reject,
    quote_request_changes,
)

urlpatterns = [
    path("", quotes_list_create, name="quotes_list_create"),
    path("<int:quote_id>/approve/", quote_approve, name="quote_approve"),
    path("<int:quote_id>/confirm/", quote_confirm, name="quote_confirm"),
    path("<int:quote_id>/reject/", quote_reject, name="quote_reject"),
    path("<int:quote_id>/request-changes/", quote_request_changes, name="quote_request_changes"),
    path("<int:quote_id>/", quote_detail, name="quote_detail"),
]

from django.urls import path

from .views import settings_detail, settings_overview, support_contact, update_pricing_roles, update_whatsapp

urlpatterns = [
    path("", settings_overview, name="settings_overview"),
    path("support-contact/", support_contact, name="support_contact"),
    path("pricing-roles/", update_pricing_roles, name="update_pricing_roles"),
    path("whatsapp/", update_whatsapp, name="update_whatsapp"),
    path("<str:key>/", settings_detail, name="settings_detail"),
]

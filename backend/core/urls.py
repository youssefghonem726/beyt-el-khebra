from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("users.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/uploads/", include("uploads.urls")),
    path("api/quotes/", include("quotes.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/invoices/", include("invoices.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/batches/", include("batches.urls")),
    path("api/deliveries/", include("deliveries.urls")),
    path("api/pricing/", include("pricing.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

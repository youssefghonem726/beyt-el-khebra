from django.db import models
from orders.models import Order  # adjust import if necessary
from users.models import User  # adjust import if necessary


class Delivery(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="deliveries", db_column="order_id"
    )
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deliveries", db_column="client_id"
    )
    address = models.TextField()
    driver = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(max_length=50, default="scheduled")
    progress = models.IntegerField(default=0)  # 0–100
    scheduled_date = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "deliveries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Delivery {self.id} - Order {self.order_id}"

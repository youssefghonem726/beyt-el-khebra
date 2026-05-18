from django.db import models
from orders.models import Order  # adjust import if your order model is elsewhere


class Batch(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="batches", db_column="order_id"
    )
    product = models.CharField(max_length=200)
    qty = models.IntegerField()
    status = models.CharField(max_length=50, default="pending")
    progress = models.IntegerField(default=0)  # completed quantity
    deadline = models.DateTimeField(null=True, blank=True)
    paper = models.CharField(max_length=200, blank=True, default="")
    priority = models.CharField(max_length=50, blank=True, default="Normal")
    assigned_to = models.CharField(max_length=200, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Batch {self.id} - {self.product}"


class Stage(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="stages")
    stage = models.CharField(max_length=200)  # e.g., 'Printing Started'
    status = models.CharField(max_length=50)  # 'completed', 'in_progress', 'pending'
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batch_stages"
        ordering = ["updated_at"]

    def __str__(self):
        return f"{self.stage} ({self.status})"

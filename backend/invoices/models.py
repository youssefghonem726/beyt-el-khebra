from django.db import models

class Invoice(models.Model):
    class Status(models.TextChoices):   # matches your order_status_enum
        UNPRICED_PENDING = 'UNPRICED_PENDING', 'Unpriced Pending'
        PRICED_PENDING_CONFIRMATION = 'PRICED_PENDING_CONFIRMATION', 'Priced Pending Confirmation'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELED = 'CANCELED', 'Canceled'
        # Add any other status values your enum supports

    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='order_id'
    )
    client = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='client_id'
    )
    due_date = models.DateField()   
    paid_date = models.DateField(null=True, blank=True)
    total_amount = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        null=True,        # table has no NOT NULL constraint
        blank=True
    )
    notes = models.TextField(null=True, blank=True, db_column='Notes')  # matches "Notes" column

    class Meta:
        db_table = 'invoices'
from django.db import models
from users.models import User
from orders.models import Order


class Quote(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('converted', 'Converted to Order'),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='quotes',
        db_column='customer_id'
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='quotes',
        db_column='order_id'
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending'
    )

    total_estimated_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    notes = models.TextField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quotes'
        managed = False

    def __str__(self):
        return f"Quote #{self.id} - {self.status}"


class QuoteItem(models.Model):
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='quote_id'
    )

    item_type = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    quantity = models.IntegerField(
        null=True,
        blank=True
    )

    estimated_unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    estimated_total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    notes = models.TextField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'quote_items'
        managed = False

    def __str__(self):
        return f"QuoteItem #{self.id} - {self.item_type}"
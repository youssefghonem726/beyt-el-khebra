from django.db import models
from users.models import User
from uploads.models import File


class Order(models.Model):
    STATUS_CHOICES = [
        ('UNPRICED_PENDING', 'Unpriced Pending'),
        ('PRICED_PENDING_CONFIRMATION', 'Priced Pending Confirmation'),
        ('CONFIRMED', 'Confirmed'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('CLOSED', 'Closed'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='orders'
    )

    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default='UNPRICED_PENDING'
    )

    quantity = models.IntegerField(null=True, blank=True)

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    payment_status = models.CharField(
        max_length=30,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid'
    )

    due_date = models.DateTimeField(
        null=True,
        blank=True
    )

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_orders',
        db_column='approved_by'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'orders'
        managed = False

    def __str__(self):
        return f"Order #{self.id} - {self.status}"

    @property
    def remaining_amount(self):
        if self.total_price is None:
            return 0

        return self.total_price - self.paid_amount


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    updated_by = models.ForeignKey(
    User,
    on_delete=models.PROTECT,
    related_name='status_updates',
    db_column='updated_by'
)
    old_status = models.CharField(max_length=50, null=True, blank=True)
    new_status = models.CharField(max_length=50)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        managed = False

    def __str__(self):
        return f"Order #{self.order_id}: {self.old_status} → {self.new_status}"


class Package(models.Model):
    BAG_TYPE_CHOICES = [
        ('cloth', 'Cloth'),
        ('plastic', 'Plastic'),
        ('nylon', 'Nylon'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='packages'
    )
    bag_type = models.CharField(
        max_length=10,
        choices=BAG_TYPE_CHOICES,
        default='cloth'
    )
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'packages'
        managed = False

    def __str__(self):
        return f"Package #{self.id} - {self.bag_type}"


class Item(models.Model):
    ITEM_TYPE_CHOICES = [
        ('book', 'Book'),
        ('poster', 'Poster'),
        ('sticker', 'Sticker'),
        ('card', 'Card'),
    ]

    PRINT_SIDE_CHOICES = [
        ('single', 'Single'),
        ('double', 'Double'),
    ]

    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name='items'
    )
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    quantity = models.IntegerField(null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    print_side = models.CharField(
        max_length=10,
        choices=PRINT_SIDE_CHOICES,
        null=True,
        blank=True
    )
    casing = models.CharField(max_length=50, null=True, blank=True)
    cover_file = models.ForeignKey(
        File,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cover_items'
    )
    content_file = models.ForeignKey(
        File,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='content_items'
    )
    preview_file = models.ForeignKey(
        File,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preview_items'
    )
    cover_weight = models.IntegerField(null=True, blank=True)
    cover_finish = models.CharField(max_length=50, null=True, blank=True)
    cover_color = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'items'
        managed = False

    def __str__(self):
        return f"Item #{self.id} - {self.item_type}"


class OrderItem(models.Model):
    STEP_CHOICES = [
        ('pending', 'Pending'),
        ('design', 'Design'),
        ('printing', 'Printing'),
        ('cutting', 'Cutting'),
        ('packaging', 'Packaging'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='order_items',
        db_column='order_id'
    )

    item_type = models.CharField(max_length=100)

    quantity = models.IntegerField(default=1)

    completed_quantity = models.IntegerField(default=0)

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    current_step = models.CharField(
        max_length=50,
        choices=STEP_CHOICES,
        default='pending'
    )

    due_date = models.DateTimeField(
        null=True,
        blank=True
    )

    notes = models.TextField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_items'
        managed = False

    def __str__(self):
        return f"OrderItem #{self.id} - {self.item_type}"

    @property
    def progress_percentage(self):
        if self.quantity == 0:
            return 0

        return int((self.completed_quantity / self.quantity) * 100)
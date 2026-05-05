from django.db import models


class User(models.Model):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('owner', 'Owner'),
        ('staff', 'Staff'),
    ]

    supabase_uid = models.CharField(max_length=128, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"


class File(models.Model):
    FILE_TYPE_CHOICES = [
        ('cover', 'Cover'),
        ('content', 'Content'),
        ('preview', 'Preview'),
        ('package_image', 'Package Image'),
    ]

    url = models.TextField()
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='files'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'files'

    def __str__(self):
        return f"{self.file_type} - {self.id}"


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
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'orders'

    def __str__(self):
        return f"Order #{self.id} - {self.status}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='status_updates'
    )
    old_status = models.CharField(max_length=50, null=True, blank=True)
    new_status = models.CharField(max_length=50)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'

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

    def __str__(self):
        return f"Item #{self.id} - {self.item_type}"


# ✅ NEW MODEL (Pricing)
class Pricing(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    # Pages
    front = models.FloatField(db_column="Front", null=True, blank=True)
    front_and_back = models.FloatField(db_column="Front_and_back", null=True, blank=True)

    # Covers
    digital_cover_300g = models.FloatField(db_column="Digital_Cover_300g", null=True, blank=True)
    digital_cover_200g = models.FloatField(db_column="Digital_Cover_200g", null=True, blank=True)
    offset_cover_200g = models.FloatField(db_column="Offset_Cover_200g", null=True, blank=True)
    offset_cover_300g = models.FloatField(db_column="Offset_Cover_300g", null=True, blank=True)

    # Coil sizes
    coil_size_10 = models.FloatField(db_column="Coil_size_10", null=True, blank=True)
    coil_size_12 = models.FloatField(db_column="Coil_size_12", null=True, blank=True)
    coil_size_14 = models.FloatField(db_column="Coil_size_14", null=True, blank=True)
    coil_size_16 = models.FloatField(db_column="Coil_size_16", null=True, blank=True)
    coil_size_18 = models.FloatField(db_column="Coil_size_18", null=True, blank=True)
    coil_size_20 = models.FloatField(db_column="Coil_size_20", null=True, blank=True)
    coil_size_22 = models.FloatField(db_column="Coil_size_22", null=True, blank=True)
    coil_size_25 = models.FloatField(db_column="Coil_size_25", null=True, blank=True)
    coil_size_28 = models.FloatField(db_column="Coil_size_28", null=True, blank=True)
    coil_size_30 = models.FloatField(db_column="Coil_size_30", null=True, blank=True)
    coil_size_32 = models.FloatField(db_column="Coil_size_32", null=True, blank=True)
    coil_size_35 = models.FloatField(db_column="Coil_size_35", null=True, blank=True)

    # Client-specific pricing
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_pricing"
    )

    class Meta:
        db_table = "Pricing"

    def __str__(self):
        if self.user:
            return f"Pricing for {self.user}"
        return "Default Pricing"
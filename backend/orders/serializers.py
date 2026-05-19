from rest_framework import serializers

from .models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    Package,
    Item
)

PRODUCTION_STEP_PROGRESS = {
    "pending": 0,
    "design": 20,
    "printing": 40,
    "cutting": 60,
    "packaging": 80,
    "ready": 100,
    "delivered": 100,
}


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    customer_phone = serializers.SerializerMethodField()
    customer_address = serializers.SerializerMethodField()
    product_summary = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    item_details = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    production_progress = serializers.SerializerMethodField()
    delivery_info = serializers.SerializerMethodField()
    status_history = serializers.SerializerMethodField()
    order_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Order
        fields = '__all__'

    def create(self, validated_data):
        order_items_data = validated_data.pop("order_items", [])
        order = Order.objects.create(**validated_data)

        for item_data in order_items_data:
            item_type = str(item_data.get("item_type") or "").strip()
            if not item_type:
                continue

            allowed_fields = {
                "item_type",
                "quantity",
                "notes",
                "due_date",
                "page_count",
                "size",
                "paper",
                "material",
                "color_mode",
                "cover",
                "binding",
                "coil",
                "finish",
                "shape",
                "print_type",
                "file_id",
                "cover_file_id",
            }
            clean_item_data = {
                key: value
                for key, value in item_data.items()
                if key in allowed_fields and value not in ("", None)
            }
            clean_item_data["item_type"] = item_type
            clean_item_data["quantity"] = clean_item_data.get("quantity") or 1

            OrderItem.objects.create(order=order, **clean_item_data)

        return order

    def get_customer_name(self, obj):
        first_name = (getattr(obj.customer, "first_name", "") or "").strip()
        last_name = (getattr(obj.customer, "last_name", "") or "").strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or getattr(obj.customer, "email", "")

    def get_customer_phone(self, obj):
        return getattr(obj.customer, "phone", None)

    def get_customer_address(self, obj):
        return getattr(obj.customer, "address", None)

    def get_product_summary(self, obj):
        details = self.get_item_details(obj)
        if details:
            if obj.packages.exists():
                return "Package Order"

            return ", ".join(
                f"{item['item_type']} ({item['quantity']} pcs)"
                for item in details
            )

        packages = list(obj.packages.all())
        if packages:
            return "Package Order"

        return f"Order #{obj.id}"

    def get_batch_code(self, obj):
        batches_by_items = []
        for item in obj.order_items.all():
            for batch in item.batches.all():
                if batch not in batches_by_items:
                    batches_by_items.append(batch)

        batches = batches_by_items or list(obj.batches.order_by("id"))
        if not batches:
            return None
        return ", ".join(f"BATCH-{batch.id:04d}" for batch in batches)

    def get_item_details(self, obj):
        order_items = list(obj.order_items.all())
        if order_items:
            return [
                {
                    "id": item.id,
                    "item_type": item.item_type or "Order Item",
                    "quantity": item.quantity or 1,
                    "notes": item.notes,
                    "current_step": item.current_step,
                    "due_date": item.due_date,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "page_count": getattr(item, "page_count", None),
                    "pages": getattr(item, "pages", None),
                    "size": getattr(item, "size", None),
                    "paper": getattr(item, "paper", None),
                    "material": getattr(item, "material", None),
                    "color_mode": getattr(item, "color_mode", None),
                    "cover": getattr(item, "cover", None),
                    "binding": getattr(item, "binding", None),
                    "coil": getattr(item, "coil", None),
                    "finish": getattr(item, "finish", None),
                    "shape": getattr(item, "shape", None),
                    "print_type": getattr(item, "print_type", None),
                    "file": self.get_file_data(getattr(item, "file", None)),
                    "cover_file": self.get_file_data(getattr(item, "cover_file", None)),
                }
                for item in order_items
            ]

        package_items = []
        for package in obj.packages.all():
            for item in package.items.all():
                package_items.append({
                    "id": item.id,
                    "item_type": item.item_type or "Package Item",
                    "quantity": item.quantity or 1,
                    "notes": package.notes,
                    "current_step": None,
                    "due_date": None,
                    "unit_price": None,
                    "total_price": None,
                    "page_count": None,
                    "pages": None,
                    "size": item.size,
                    "paper": None,
                    "material": None,
                    "color_mode": item.print_side,
                    "cover": item.cover_finish or item.cover_color or item.cover_weight,
                    "binding": item.casing,
                    "coil": None,
                })

        return package_items

    def get_file_data(self, file_record):
        if not file_record:
            return None

        return {
            "id": file_record.id,
            "file_name": file_record.file_name,
            "url": file_record.url,
            "file_type": file_record.file_type,
            "mime_type": file_record.mime_type,
            "file_size": file_record.file_size,
        }

    def get_item_count(self, obj):
        order_item_count = obj.order_items.count()
        if order_item_count:
            return order_item_count

        return sum(package.items.count() for package in obj.packages.all())

    def get_production_progress(self, obj):
        items = list(obj.order_items.all())
        if not items:
            if obj.status in ("COMPLETED", "CLOSED"):
                return 100
            return 0

        item_progress = [
            PRODUCTION_STEP_PROGRESS.get(item.current_step, 0)
            for item in items
        ]

        return int(sum(item_progress) / len(item_progress))

    def get_delivery_info(self, obj):
        delivery = obj.deliveries.order_by("-created_at").first()
        if not delivery:
            return None

        return {
            "id": delivery.id,
            "status": delivery.status,
            "progress": delivery.progress,
            "scheduledDate": delivery.scheduled_date,
            "deliveredAt": delivery.delivered_at,
            "address": delivery.address,
            "driver": delivery.driver,
            "company": delivery.company,
            "phone": delivery.phone,
            "notes": delivery.notes,
        }

    def get_status_history(self, obj):
        return [
            {
                "id": history.id,
                "old_status": history.old_status,
                "new_status": history.new_status,
                "notes": history.notes,
                "created_at": history.created_at,
            }
            for history in obj.status_history.all().order_by("created_at")
        ]


class OrderStatusHistorySerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderStatusHistory
        fields = '__all__'


class PackageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Package
        fields = '__all__'


class ItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = Item
        fields = '__all__'

from rest_framework import serializers

from .models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    Package,
    Item
)


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    product_summary = serializers.SerializerMethodField()
    item_details = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
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

            OrderItem.objects.create(
                order=order,
                item_type=item_type,
                quantity=item_data.get("quantity") or 1,
                notes=item_data.get("notes") or None,
            )

        return order

    def get_customer_name(self, obj):
        first_name = (getattr(obj.customer, "first_name", "") or "").strip()
        last_name = (getattr(obj.customer, "last_name", "") or "").strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or getattr(obj.customer, "email", "")

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

    def get_item_count(self, obj):
        order_item_count = obj.order_items.count()
        if order_item_count:
            return order_item_count

        return sum(package.items.count() for package in obj.packages.all())


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

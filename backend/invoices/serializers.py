from rest_framework import serializers
from .models import Invoice

class InvoiceSerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)
    clientId = serializers.IntegerField(source="client_id", read_only=True)
    client_name = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    item_summary = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "created_at",
            "order",
            "orderId",
            "client",
            "clientId",
            "client_name",
            "due_date",
            "paid_date",
            "total_amount",
            "total",
            "paid_amount",
            "remaining_amount",
            "status",
            "payment_status",
            "item_summary",
            "items",
            "notes",
        ]

    def get_client_name(self, obj):
        if not obj.client:
            return "Unknown"

        full_name = f"{obj.client.first_name or ''} {obj.client.last_name or ''}".strip()
        return full_name or obj.client.email or "Unknown"

    def get_total(self, obj):
        if obj.total_amount is not None:
            return float(obj.total_amount)

        if obj.order and obj.order.total_price is not None:
            return float(obj.order.total_price)

        return 0

    def get_paid_amount(self, obj):
        if obj.order:
            return float(obj.order.paid_amount or 0)

        return 0

    def get_remaining_amount(self, obj):
        return max(self.get_total(obj) - self.get_paid_amount(obj), 0)

    def get_payment_status(self, obj):
        if obj.order:
            return obj.order.payment_status

        return "unpaid"

    def get_item_summary(self, obj):
        items = self.get_items(obj)
        if not items:
            if obj.order_id:
                return f"Order #{obj.order_id}"

            return "Invoice item"

        return ", ".join(
            f"{item['item_type']} ({item['quantity']} pcs)"
            for item in items
        )

    def get_items(self, obj):
        if not obj.order:
            return []

        return [
            {
                "id": item.id,
                "item_type": item.item_type or "Order Item",
                "quantity": item.quantity or 1,
                "unit_price": float(item.unit_price) if item.unit_price is not None else None,
                "total_price": float(item.total_price) if item.total_price is not None else None,
            }
            for item in obj.order.order_items.all()
        ]

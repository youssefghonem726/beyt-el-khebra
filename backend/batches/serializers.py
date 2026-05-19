from rest_framework import serializers
from .models import Batch, Stage
from .services import format_batch_code


class StageSerializer(serializers.ModelSerializer):
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Stage
        fields = ["id", "stage", "status", "updatedAt"]


class BatchSerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)
    orderIds = serializers.SerializerMethodField()
    batchCode = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    clientName = serializers.SerializerMethodField()
    clientNames = serializers.SerializerMethodField()
    itemCount = serializers.SerializerMethodField()
    stages = StageSerializer(many=True, read_only=True)
    assignedTo = serializers.CharField(source="assigned_to", read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id",
            "orderId",
            "orderIds",
            "batchCode",
            "batch_code",
            "clientName",
            "clientNames",
            "itemCount",
            "product",
            "qty",
            "status",
            "progress",
            "deadline",
            "paper",
            "priority",
            "assignedTo",
            "notes",
            "stages",
            "created_at",
            "updated_at",
        ]

    def get_batchCode(self, obj):
        return format_batch_code(obj)

    def get_batch_code(self, obj):
        return format_batch_code(obj)

    def get_clientName(self, obj):
        names = self.get_clientNames(obj)
        if names:
            return names[0]
        customer = obj.order.customer
        name = f"{customer.first_name or ''} {customer.last_name or ''}".strip()
        return name or customer.email or "Unknown"

    def get_orderIds(self, obj):
        item_order_ids = list(
            obj.order_items.values_list("order_id", flat=True).distinct()
        )
        if item_order_ids:
            return item_order_ids
        return [obj.order_id]

    def get_clientNames(self, obj):
        names = []
        items = obj.order_items.select_related("order", "order__customer").all()
        for item in items:
            customer = item.order.customer
            name = f"{customer.first_name or ''} {customer.last_name or ''}".strip()
            label = name or customer.email or "Unknown"
            if label not in names:
                names.append(label)

        if names:
            return names

        customer = obj.order.customer
        name = f"{customer.first_name or ''} {customer.last_name or ''}".strip()
        return [name or customer.email or "Unknown"]

    def get_itemCount(self, obj):
        count = obj.order_items.count()
        return count or 1

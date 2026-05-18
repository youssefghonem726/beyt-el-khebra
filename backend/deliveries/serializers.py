from rest_framework import serializers
from .models import Delivery


class DeliverySerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)
    clientId = serializers.IntegerField(source="client_id", read_only=True)
    clientName = serializers.SerializerMethodField()
    clientEmail = serializers.CharField(source="client.email", read_only=True)
    orderStatus = serializers.CharField(source="order.status", read_only=True)
    orderTotal = serializers.DecimalField(source="order.total_price", max_digits=10, decimal_places=2, read_only=True)
    scheduledDate = serializers.DateTimeField(source="scheduled_date", read_only=True)
    deliveredAt = serializers.DateTimeField(source="delivered_at", read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "id",
            "orderId",
            "clientId",
            "clientName",
            "clientEmail",
            "orderStatus",
            "orderTotal",
            "address",
            "driver",
            "company",
            "phone",
            "status",
            "progress",
            "scheduledDate",
            "deliveredAt",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_clientName(self, obj):
        first_name = (obj.client.first_name or "").strip()
        last_name = (obj.client.last_name or "").strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or obj.client.email or "Unknown"

from rest_framework import serializers
from .models import Delivery


class DeliverySerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)
    clientId = serializers.IntegerField(source="client_id", read_only=True)
    scheduledDate = serializers.DateTimeField(source="scheduled_date", read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "id",
            "orderId",
            "clientId",
            "address",
            "driver",
            "company",
            "phone",
            "status",
            "progress",
            "scheduledDate",
            "created_at",
            "updated_at",
        ]

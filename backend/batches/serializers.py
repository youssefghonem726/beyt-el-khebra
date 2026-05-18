from rest_framework import serializers
from .models import Batch, Stage


class StageSerializer(serializers.ModelSerializer):
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Stage
        fields = ["id", "stage", "status", "updatedAt"]


class BatchSerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)
    stages = StageSerializer(many=True, read_only=True)
    assignedTo = serializers.CharField(source="assigned_to", read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id",
            "orderId",
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

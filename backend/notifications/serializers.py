from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "user_id",
            "title",
            "body",
            "unread",
            "action_label",
            "action_page",
            "created_at",
        ]

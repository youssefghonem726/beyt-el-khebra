from rest_framework import serializers
from .models import SupportTicket

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['id', 'user', 'subject', 'order_id', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'status', 'created_at']

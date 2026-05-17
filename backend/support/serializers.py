from rest_framework import serializers
from .models import SupportTicket

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['id', 'user', 'subject', 'order_id', 'message', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
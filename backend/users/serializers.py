from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'id',
            'supabase_uid',
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'role',
            'is_active',
            'created_at',
        ]

from rest_framework import serializers

from .models import (
    Order,
    OrderStatusHistory,
    Package,
    Item
)


class OrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = Order
        fields = '__all__'


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
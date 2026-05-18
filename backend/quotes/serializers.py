from rest_framework import serializers
from .models import Quote, QuoteItem
from orders.models import Order


class QuoteItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuoteItem
        fields = [
            'id',
            'quote',
            'item_type',
            'quantity',
            'estimated_unit_price',
            'estimated_total_price',
            'notes',
        ]
        read_only_fields = ['id', 'quote']


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id',
            'customer',
            'order',
            'status',
            'total_estimated_price',
            'notes',
            'created_at',
            'items',
        ]
        read_only_fields = [
            'id',
            'customer',
            'order',
            'created_at',
            'items',
        ]


class QuoteCreateSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(write_only=True, required=True)
    items = QuoteItemSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Quote
        fields = [
            'id',
            'order_id',
            'status',
            'total_estimated_price',
            'notes',
            'items',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order_id = validated_data.pop('order_id')
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise serializers.ValidationError({
                'order_id': 'Order not found.'
            })

        quote = Quote.objects.create(
            customer=order.customer,
            order_id=order_id,
            **validated_data
        )

        for item_data in items_data:
            QuoteItem.objects.create(
                quote=quote,
                **item_data
            )

        return quote

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        validated_data.pop('order_id', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()

            for item_data in items_data:
                QuoteItem.objects.create(
                    quote=instance,
                    **item_data
                )

        return instance

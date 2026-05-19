from rest_framework import serializers
from .models import File


class FileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = '__all__'

    def get_url(self, obj):
        url = obj.url or ""
        request = self.context.get("request")

        if request and url.startswith("/"):
            return request.build_absolute_uri(url)

        return url

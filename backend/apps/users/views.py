from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import IsOwner, IsManager, IsClient


class OwnerOnlyView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        return Response({"data": "owner secret"})


class ManagerView(APIView):
    permission_classes = [IsManager]  # owner + manager can access

    def get(self, request):
        return Response({"data": "manager content"})


class ClientView(APIView):
    permission_classes = [IsClient]  # everyone can access

    def get(self, request):
        return Response({"data": "client content"})

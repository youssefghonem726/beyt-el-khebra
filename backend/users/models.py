from django.db import models


class User(models.Model):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('owner', 'Owner'),
        ('staff', 'Staff'),
    ]

    supabase_uid = models.CharField(max_length=128, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

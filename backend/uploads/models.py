from django.db import models
from users.models import User


class File(models.Model):
    FILE_TYPE_CHOICES = [
        ('cover', 'Cover'),
        ('content', 'Content'),
        ('preview', 'Preview'),
        ('package_image', 'Package Image'),
    ]

    url = models.TextField()
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='files',
        db_column='uploaded_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'files'
        managed = False

    def __str__(self):
        return f"{self.file_type} - {self.id}"
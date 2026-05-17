from django.db import models
from users.models import User

class File(models.Model):
    id = models.AutoField(primary_key=True)   
    url = models.TextField(null=True, blank=True)
    file_type = models.CharField(max_length=20, null=True, blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_files',
        db_column='uploaded_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    file_name = models.TextField(null=True, blank=True)
    reorder_count = models.SmallIntegerField(null=True, blank=True, default=0)
    owner_id = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_files',
        db_column='owner_id'
    )
    mime_type = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'files'   
        managed = False      
from django.db import models
from users.models import User  # adjust import if needed


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        to_field="id",
        db_column="user_id",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = (
        models.TextField()
    )  # originally 'text' in DB, but CharField is fine; could be TextField if very long
    body = models.TextField()
    unread = models.BooleanField(default=True)
    action_label = models.TextField(null=True, blank=True)
    action_page = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

from django.db import models
from users.models import User

class SupportTicket(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='support_tickets',
        db_column='user_id'
    )
    subject = models.CharField(max_length=200)
    order_id = models.CharField(max_length=50, null=True, blank=True, db_column='order_id')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_tickets'
        # If the table already exists, set managed = False and later fake the migration.
        # For new table, keep managed = True.
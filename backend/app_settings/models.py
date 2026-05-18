from django.db import models


class Setting(models.Model):
    key = models.TextField(unique=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "settings"
        managed = False

    def __str__(self):
        return self.key

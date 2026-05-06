from django.db import models
from users.models import User


class Pricing(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    front = models.FloatField(db_column="Front", null=True, blank=True)
    front_and_back = models.FloatField(db_column="Front_and_back", null=True, blank=True)

    digital_cover_300g = models.FloatField(db_column="Digital_Cover_300g", null=True, blank=True)
    digital_cover_200g = models.FloatField(db_column="Digital_Cover_200g", null=True, blank=True)
    offset_cover_200g = models.FloatField(db_column="Offset_Cover_200g", null=True, blank=True)
    offset_cover_300g = models.FloatField(db_column="Offset_Cover_300g", null=True, blank=True)

    coil_size_10 = models.FloatField(db_column="Coil_size_10", null=True, blank=True)
    coil_size_12 = models.FloatField(db_column="Coil_size_12", null=True, blank=True)
    coil_size_14 = models.FloatField(db_column="Coil_size_14", null=True, blank=True)
    coil_size_16 = models.FloatField(db_column="Coil_size_16", null=True, blank=True)
    coil_size_18 = models.FloatField(db_column="Coil_size_18", null=True, blank=True)
    coil_size_20 = models.FloatField(db_column="Coil_size_20", null=True, blank=True)
    coil_size_22 = models.FloatField(db_column="Coil_size_22", null=True, blank=True)
    coil_size_25 = models.FloatField(db_column="Coil_size_25", null=True, blank=True)
    coil_size_28 = models.FloatField(db_column="Coil_size_28", null=True, blank=True)
    coil_size_30 = models.FloatField(db_column="Coil_size_30", null=True, blank=True)
    coil_size_32 = models.FloatField(db_column="Coil_size_32", null=True, blank=True)
    coil_size_35 = models.FloatField(db_column="Coil_size_35", null=True, blank=True)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_pricing"
    )

    class Meta:
        db_table = "Pricing"
        managed = False

    def __str__(self):
        if self.user:
            return f"Pricing for {self.user}"
        return "Default Pricing"
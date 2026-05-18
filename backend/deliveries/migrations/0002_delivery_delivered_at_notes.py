from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("deliveries", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="delivery",
            name="delivered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="delivery",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
    ]

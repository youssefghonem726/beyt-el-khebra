from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("support", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="supportticket",
            name="status",
            field=models.CharField(default="open", max_length=20),
        ),
    ]

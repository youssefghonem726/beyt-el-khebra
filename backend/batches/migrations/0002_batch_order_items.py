from django.db import migrations, models


def backfill_batch_order_items(apps, schema_editor):
    Batch = apps.get_model("batches", "Batch")
    through_model = Batch.order_items.through

    rows = []
    for batch in Batch.objects.exclude(order_id__isnull=True).iterator():
        for order_item_id in batch.order.order_items.values_list("id", flat=True):
            rows.append(through_model(batch_id=batch.id, orderitem_id=order_item_id))

    if rows:
        through_model.objects.bulk_create(rows, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ("batches", "0001_initial"),
        ("orders", "0002_orderitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="batch",
            name="order_items",
            field=models.ManyToManyField(
                blank=True,
                db_table="batch_order_items",
                related_name="batches",
                to="orders.orderitem",
            ),
        ),
        migrations.RunPython(backfill_batch_order_items, migrations.RunPython.noop),
    ]

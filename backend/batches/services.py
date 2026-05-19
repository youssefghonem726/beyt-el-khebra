from datetime import timedelta

from django.db.models import Q

from .models import Batch, Stage


OPEN_BATCH_STATUSES = ("open", "pending", "in_progress")
COMPLETE_STEPS = ("ready", "delivered")
GROUP_FIELDS = (
    "item_type",
    "size",
    "paper_or_material",
    "color_mode",
    "finish",
    "print_type",
)
DUE_DATE_WINDOW_DAYS = 2


def format_batch_code(batch):
    return f"BATCH-{batch.id:04d}"


def item_product_label(item):
    return f"{item.item_type or 'Item'} ({item.quantity or 1} pcs)"


def batch_product_summary(items):
    if not items:
        return "Production Batch"

    labels = []
    for item in items:
        label = item_product_label(item)
        if label not in labels:
            labels.append(label)

    return ", ".join(labels)


def order_product_summary(order):
    items = list(order.order_items.all())
    if not items:
        return f"Order #{order.id}"

    return batch_product_summary(items)


def normalize_value(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    return text or None


def item_due_date(item):
    value = item.due_date or getattr(item.order, "due_date", None)
    if not value:
        return None
    return value.date() if hasattr(value, "date") else value


def item_group_signature(item):
    return {
        "item_type": normalize_value(item.item_type),
        "size": normalize_value(item.size),
        "paper_or_material": normalize_value(item.paper) or normalize_value(item.material),
        "color_mode": normalize_value(item.color_mode),
        "finish": normalize_value(item.finish),
        "print_type": normalize_value(item.print_type),
        "due_date": item_due_date(item),
    }


def important_specs_compatible(left, right):
    for field in GROUP_FIELDS:
        left_value = left.get(field)
        right_value = right.get(field)
        if bool(left_value) != bool(right_value):
            return False
        if left_value != right_value:
            return False

    left_due = left.get("due_date")
    right_due = right.get("due_date")
    if bool(left_due) != bool(right_due):
        return False
    if left_due and right_due and abs(left_due - right_due) > timedelta(days=DUE_DATE_WINDOW_DAYS):
        return False

    return True


def batch_signature(batch):
    items = list(batch.order_items.select_related("order").all())
    active_items = [item for item in items if item.current_step not in COMPLETE_STEPS]
    source_item = active_items[0] if active_items else (items[0] if items else None)
    if not source_item:
        return None
    return item_group_signature(source_item)


def candidate_batches_for_item(item):
    item_type = normalize_value(item.item_type)
    candidates = Batch.objects.filter(status__in=OPEN_BATCH_STATUSES).prefetch_related(
        "order_items",
        "order_items__order",
    )

    if item_type:
        candidates = candidates.filter(
            Q(product__icontains=item.item_type)
            | Q(order_items__item_type__iexact=item.item_type)
        ).distinct()

    return candidates


def find_matching_open_batch(item):
    if item.current_step in COMPLETE_STEPS:
        return None

    signature = item_group_signature(item)
    for batch in candidate_batches_for_item(item):
        existing_signature = batch_signature(batch)
        if existing_signature and important_specs_compatible(signature, existing_signature):
            return batch

    return None


def create_batch_for_item(item):
    order = item.order
    batch = Batch.objects.create(
        order=order,
        product=item_product_label(item),
        qty=item.quantity or 1,
        progress=item.completed_quantity or 0,
        status="pending",
        deadline=item.due_date or getattr(order, "due_date", None),
        paper=item.paper or item.material or "",
        priority="Normal",
        notes="Auto-created for matching production items.",
    )
    batch.order_items.add(item)

    for stage in ("Design", "Printing", "Cutting", "Packaging", "Ready"):
        Stage.objects.create(batch=batch, stage=stage, status="pending")

    return batch


def refresh_batch(batch):
    items = list(batch.order_items.select_related("order", "order__customer").all())
    if not items:
        return batch

    total_qty = sum(item.quantity or 0 for item in items) or batch.qty or 1
    completed_qty = sum(item.completed_quantity or 0 for item in items)
    all_complete = all(item.current_step in COMPLETE_STEPS for item in items)
    any_started = any(item.current_step not in (None, "", "pending") for item in items)

    batch.qty = total_qty
    batch.progress = completed_qty
    batch.product = batch_product_summary(items)
    batch.paper = items[0].paper or items[0].material or ""
    batch.deadline = min(
        [value for value in (item.due_date or item.order.due_date for item in items) if value],
        default=batch.deadline,
    )

    if all_complete:
        batch.status = "completed"
    elif any_started:
        batch.status = "in_progress"
    else:
        batch.status = "pending"

    batch.save(update_fields=[
        "qty",
        "progress",
        "product",
        "paper",
        "deadline",
        "status",
        "updated_at",
    ])
    return batch


def ensure_batches_for_order(order):
    items = list(order.order_items.select_related("order").all())
    if not items:
        existing = order.batches.order_by("id").first()
        if existing:
            return [existing]
        return [create_legacy_order_batch(order)]

    assigned_batches = []
    for item in items:
        existing_item_batches = list(item.batches.all())
        if item.current_step in COMPLETE_STEPS and existing_item_batches:
            batch = existing_item_batches[0]
        else:
            item_batches = [
                batch
                for batch in existing_item_batches
                if batch.status in OPEN_BATCH_STATUSES
            ]
            batch = item_batches[0] if item_batches else find_matching_open_batch(item)

        if not batch:
            batch = create_batch_for_item(item)
        else:
            batch.order_items.add(item)
            refresh_batch(batch)

        if batch not in assigned_batches:
            assigned_batches.append(batch)

    return [refresh_batch(batch) for batch in assigned_batches]


def create_legacy_order_batch(order):
    batch = Batch.objects.create(
        order=order,
        product=order_product_summary(order),
        qty=order.quantity or 1,
        progress=0,
        status="pending",
        deadline=getattr(order, "due_date", None),
        paper="",
        priority="Normal",
        notes="Auto-created for order without item details.",
    )

    for stage in ("Design", "Printing", "Cutting", "Packaging", "Ready"):
        Stage.objects.create(batch=batch, stage=stage, status="pending")

    return batch


def ensure_batch_for_order(order):
    batches = ensure_batches_for_order(order)
    return batches[0] if batches else None


def sync_batches_for_order(order):
    batches = set(ensure_batches_for_order(order))
    for item in order.order_items.all():
        batches.update(item.batches.all())

    refreshed = [refresh_batch(batch) for batch in batches]
    return refreshed[0] if refreshed else None

from typing import Iterable

from users.models import User

from .models import Notification


def create_notification(user, title, body, action_label=None, action_page=None):
    if not user:
        return None

    notification, _ = Notification.objects.get_or_create(
        user=user,
        title=title,
        body=body,
        action_label=action_label,
        action_page=action_page,
        defaults={"unread": True},
    )
    return notification


def notify_users(users: Iterable[User], title, body, action_label=None, action_page=None):
    notifications = []
    for user in users:
        notification = create_notification(
            user=user,
            title=title,
            body=body,
            action_label=action_label,
            action_page=action_page,
        )
        if notification:
            notifications.append(notification)

    return notifications


def notify_owner_staff(title, body, action_label=None, action_page=None):
    users = User.objects.filter(role__in=("owner", "staff"), is_active=True)
    return notify_users(users, title, body, action_label, action_page)

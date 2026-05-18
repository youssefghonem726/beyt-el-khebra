import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotification,
} from '../../lib/api/notificationsService';
import type { Notification } from '../../lib/api/notificationsService';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OwnerNotifications() {
  const { navigateTopLevel } = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data.data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setNotifications([]);
        } else {
          console.error('Failed to load notifications:', err);
          setError('Could not load notifications. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const readCount = notifications.length - unreadCount;

  const replaceNotification = (updated: Notification) => {
    setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleMarkRead = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await markNotificationRead(id);
      replaceNotification(res.data.data);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      setError('Could not update notification.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleUnread = async (notification: Notification) => {
    setSavingId(notification.id);
    setError(null);
    try {
      const res = await updateNotification(notification.id, { unread: !notification.unread });
      replaceNotification(res.data.data);
    } catch (err) {
      console.error('Failed to update notification:', err);
      setError('Could not update notification.');
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setSavingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
      setError('Could not update notifications.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = window.confirm('Delete this notification?');
    if (!shouldDelete) return;

    setSavingId(id);
    setError(null);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError('Could not delete notification.');
    } finally {
      setSavingId(null);
    }
  };

  const handleClearRead = async () => {
    const shouldClear = window.confirm('Delete all read notifications?');
    if (!shouldClear) return;

    setClearingRead(true);
    setError(null);
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => n.unread));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      setError('Could not clear read notifications.');
    } finally {
      setClearingRead(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-notifications">
        <Topbar title="Notifications" />
        <section className="stack">
          <div className="loading-state">Loading notifications...</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-notifications">
      <Topbar title="Notifications" />
      <section className="stack">
        {error && <div className="error-state">{error}</div>}

        <div className="table-head">
          <div>
            <h3 style={{ margin: 0 }}>Inbox</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {unreadCount} unread
            </p>
          </div>
          <button
            className="btn"
            type="button"
            onClick={handleMarkAllRead}
            disabled={savingAll || unreadCount === 0}
          >
            {savingAll ? 'Saving...' : 'Mark all read'}
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleClearRead}
            disabled={clearingRead || readCount === 0}
          >
            {clearingRead ? 'Clearing...' : 'Clear read'}
          </button>
        </div>

        {notifications.length === 0 ? (
          <div
            className="box"
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              padding: 48,
            }}
          >
            No notifications.
          </div>
        ) : (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className="box"
              style={{
                borderLeft: notification.unread
                  ? '4px solid var(--primary)'
                  : '1px solid var(--border)',
              }}
            >
              <div className="table-head" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{notification.title}</h3>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
                <span className={`status ${notification.unread ? 'pending' : 'done'}`}>
                  {notification.unread ? 'Unread' : 'Read'}
                </span>
              </div>

              <p>{notification.body}</p>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {notification.action_page && notification.action_label && (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => navigateTopLevel(notification.action_page || '')}
                  >
                    {notification.action_label}
                  </button>
                )}

                {notification.unread && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={savingId === notification.id}
                  >
                    {savingId === notification.id ? 'Saving...' : 'Mark read'}
                  </button>
                )}

                {!notification.unread && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleToggleUnread(notification)}
                    disabled={savingId === notification.id}
                  >
                    Mark unread
                  </button>
                )}

                <button
                  className="btn"
                  type="button"
                  onClick={() => handleDelete(notification.id)}
                  disabled={savingId === notification.id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}

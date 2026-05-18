import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
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
  return (
    <Suspense fallback={null}>
      <OwnerNotificationsInner />
    </Suspense>
  );
}

function OwnerNotificationsInner() {
  const { t } = useTranslation(['common', 'ownerNotifications']);
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
          setError(t('ownerNotifications:error'));
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
      setError(t('ownerNotifications:updateError'));
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
      setError(t('ownerNotifications:updateError'));
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
      setError(t('ownerNotifications:updateAllError'));
    } finally {
      setSavingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = window.confirm(t('ownerNotifications:confirmDelete'));
    if (!shouldDelete) return;

    setSavingId(id);
    setError(null);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError(t('ownerNotifications:deleteError'));
    } finally {
      setSavingId(null);
    }
  };

  const handleClearRead = async () => {
    const shouldClear = window.confirm(t('ownerNotifications:confirmClearRead'));
    if (!shouldClear) return;

    setClearingRead(true);
    setError(null);
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => n.unread));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      setError(t('ownerNotifications:clearError'));
    } finally {
      setClearingRead(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-notifications">
        <Topbar title={t('ownerNotifications:title')} />
        <section className="stack">
          <div className="loading-state">{t('ownerNotifications:loading')}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-notifications">
      <Topbar title={t('ownerNotifications:title')} />
      <section className="stack">
        {error && <div className="error-state">{error}</div>}

        <div className="table-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('ownerNotifications:inbox')}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {t('ownerNotifications:unreadCount', { count: unreadCount })}
            </p>
          </div>
          <button
            className="btn"
            type="button"
            onClick={handleMarkAllRead}
            disabled={savingAll || unreadCount === 0}
          >
            {savingAll ? t('ownerNotifications:savingAll') : t('ownerNotifications:markAllRead')}
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleClearRead}
            disabled={clearingRead || readCount === 0}
          >
            {clearingRead ? t('ownerNotifications:clearing') : t('ownerNotifications:clearRead')}
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="box" style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
            {t('ownerNotifications:empty')}
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
                  {notification.unread ? t('ownerNotifications:unread') : t('ownerNotifications:read')}
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
                    {savingId === notification.id ? t('ownerNotifications:saving') : t('ownerNotifications:markRead')}
                  </button>
                )}

                {!notification.unread && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleToggleUnread(notification)}
                    disabled={savingId === notification.id}
                  >
                    {t('ownerNotifications:markUnread')}
                  </button>
                )}

                <button
                  className="btn"
                  type="button"
                  onClick={() => handleDelete(notification.id)}
                  disabled={savingId === notification.id}
                >
                  {t('ownerNotifications:delete')}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}

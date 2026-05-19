import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  deleteNotification,
  type Notification as BackendNotification,
} from '../../lib/api/notificationsService';

interface DisplayNotification {
  id: number;
  title: string;
  time: string;
  body: string;
  unread: boolean;
  action: {
    label: string;
    page: string;
  };
}

const TITLE_KEY_MAP: Record<string, string> = {
  'Quote ready': 'quoteReady',
  'Order completed': 'orderCompleted',
  'Order in production': 'orderInProduction',
  'Delivery created': 'deliveryCreated',
  'Delivery updated': 'deliveryUpdated',
};

function translateTitle(title: string, t: (key: string) => string): string {
  const key = TITLE_KEY_MAP[title];
  if (!key) return title;
  const result = t(`clientNotifications:messages.titles.${key}`);
  return result.startsWith('messages.') ? title : result;
}

function translateBody(body: string, t: (key: string, opts?: Record<string, string>) => string): string {
  let m: RegExpMatchArray | null;

  m = body.match(/^Your quote is ready for Order #(\d+)\.$/);
  if (m) return t('clientNotifications:messages.bodies.quoteReady', { orderId: m[1] });

  m = body.match(/^Your order #(\d+) is completed\.$/);
  if (m) return t('clientNotifications:messages.bodies.orderCompleted', { orderId: m[1] });

  m = body.match(/^Your order #(\d+) is now in production\.$/);
  if (m) return t('clientNotifications:messages.bodies.orderInProduction', { orderId: m[1] });

  m = body.match(/^Delivery was created for Order #(\d+)\.$/);
  if (m) return t('clientNotifications:messages.bodies.deliveryCreated', { orderId: m[1] });

  m = body.match(/^Delivery for Order #(\d+) is now (.+)\.$/);
  if (m) {
    const statusRaw = m[2].replace(/ /g, '_');
    const statusKey = `clientNotifications:deliveryStatusText.${statusRaw}`;
    const statusT = t(statusKey);
    const status = statusT === statusKey ? m[2] : statusT;
    return t('clientNotifications:messages.bodies.deliveryUpdated', { orderId: m[1], status });
  }

  return body;
}

function translateActionLabel(label: string, t: (key: string) => string): string {
  const keyPath = `actions.${label}`;
  const translated = t(`clientNotifications:${keyPath}`);
  return translated === keyPath ? label : translated;
}

function formatTime(iso: string, lang: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionPath(page: string): string {
  if (!page || page === '/') return '/client';
  if (page.startsWith('/')) return page;
  if (page === 'quotes' || page === 'quote-detail') return '/client/quotes';
  if (page === 'client-invoices' || page === 'invoice-detail') return '/client/invoices';
  if (page === 'my-orders') return '/client/orders';
  if (page === 'client-notifications') return '/client/notifications';
  return `/client/${page}`;
}

export default function ClientNotifications() {
  return (
    <Suspense fallback={null}>
      <ClientNotificationsInner />
    </Suspense>
  );
}

function ClientNotificationsInner() {
  const { t, i18n } = useTranslation(['common', 'clientNotifications']);
  const { navigateTopLevel } = useNavigation();
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBulkAction, setSavingBulkAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications();
        const backendNotifs: BackendNotification[] = res.data.data;

        setNotifications(
          backendNotifs.map((n) => ({
            id: n.id,
            title: n.title,
            time: formatTime(n.created_at, i18n.language),
            body: n.body,
            unread: n.unread,
            action: {
              label: n.action_label || '',
              page: n.action_page || '/',
            },
          }))
        );
      } catch (err: any) {
        if (
          err?.response?.status === 404 ||
          (err?.response?.data && typeof err.response.data !== 'object')
        ) {
          setNotifications([]);
        } else {
          console.error('Failed to load notifications:', err);
          setError(t('clientNotifications:error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const openNotification = async (notification: DisplayNotification) => {
    try {
      if (notification.unread) {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, unread: false } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    navigateTopLevel(actionPath(notification.action.page));
  };

  const dismiss = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
      setError(t('clientNotifications:dismissError'));
    }
  };

  const markAllRead = async () => {
    try {
      setSavingBulkAction(true);
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, unread: false }))
      );
      setError(null);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
      setError(t('clientNotifications:markAllReadError'));
    } finally {
      setSavingBulkAction(false);
    }
  };

  const clearRead = async () => {
    try {
      setSavingBulkAction(true);
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((notification) => notification.unread));
      setError(null);
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      setError(t('clientNotifications:clearReadError'));
    } finally {
      setSavingBulkAction(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="client-notifications">
        <Topbar title={t('clientNotifications:title')} />
        <div className="loading-state">{t('clientNotifications:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-notifications">
      <Topbar title={t('clientNotifications:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div
        className="table-head"
        style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <div>
          <strong>{notifications.filter((n) => n.unread).length}</strong>{' '}
          {t('clientNotifications:unread')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm"
            type="button"
            onClick={markAllRead}
            disabled={
              savingBulkAction ||
              notifications.every((n) => !n.unread)
            }
          >
            {savingBulkAction
              ? t('clientNotifications:saving')
              : t('clientNotifications:markAllRead')}
          </button>
          <button
            className="btn btn-sm btn-outline"
            type="button"
            onClick={clearRead}
            disabled={
              savingBulkAction ||
              notifications.every((n) => n.unread)
            }
          >
            {t('clientNotifications:clearRead')}
          </button>
        </div>
      </div>

      <section className="stack notifications-stack">
        {notifications.length === 0 && (
          <div className="box" style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
            {t('clientNotifications:empty')}
          </div>
        )}
        {notifications.map((n) => (
          <article key={n.id} className={`box notification-card${n.unread ? ' unread' : ''}`}>
            <div
              className="notification-header"
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <h3>{translateTitle(n.title, t)}</h3>
              <span className="timestamp" style={{ color: 'var(--muted)', fontSize: 13 }}>
                {n.time}
              </span>
            </div>
            <p>{translateBody(n.body, t)}</p>
            <div className="notification-actions" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm${n.unread ? ' primary' : ''}`}
                onClick={() => openNotification(n)}
              >
                {translateActionLabel(n.action.label || t('clientNotifications:view'), t)}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => dismiss(n.id)}>
                {t('clientNotifications:dismiss')}
              </button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
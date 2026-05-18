import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { getNotifications } from '../../lib/api/notificationsService';
import type { Notification as BackendNotification } from '../../lib/api/notificationsService';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications();
        const backendNotifs: BackendNotification[] = res.data.data;

        setNotifications(backendNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          time: formatTime(n.created_at, i18n.language),
          body: n.body,
          unread: n.unread,
          action: {
            label: n.action_label || '',
            page: n.action_page || '/',
          },
        })));
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

  const dismiss = (id: number) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  if (loading) {
    return (
      <AppShell role="client" activePage="client-notifications">
        <Topbar title={t('clientNotifications:title')} />
        <div className="loading-state">{t('clientNotifications:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="client-notifications">
        <Topbar title={t('clientNotifications:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-notifications">
      <Topbar title={t('clientNotifications:title')} />
      <section className="stack notifications-stack">
        {notifications.length === 0 && (
          <div className="box" style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
            {t('clientNotifications:empty')}
          </div>
        )}
        {notifications.map((n) => (
          <article key={n.id} className={`box notification-card${n.unread ? ' unread' : ''}`}>
            <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3>{translateTitle(n.title, t)}</h3>
              <span className="timestamp" style={{ color: 'var(--muted)', fontSize: 13 }}>
                {n.time}
              </span>
            </div>
            <p>{translateBody(n.body, t)}</p>
            <div className="notification-actions" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              {n.action.label && (
                <button
                  className={`btn btn-sm${n.unread ? ' primary' : ''}`}
                  onClick={() => navigateTopLevel(n.action.page)}
                >
                  {translateActionLabel(n.action.label, t)}
                </button>
              )}
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

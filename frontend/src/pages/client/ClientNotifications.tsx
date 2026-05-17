import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service import – bypasses VITE_USE_MOCK
import { getNotifications } from '../../lib/api/notificationsService';
import type { Notification as BackendNotification } from '../../lib/api/notificationsService';

// ─── Local display shape (matches original UI) ────────────────────────
interface DisplayNotification {
  id: number;
  title: string;
  time: string;              // formatted from created_at
  body: string;
  unread: boolean;
  action: {
    label: string;
    page: string;
  };
}

// ─── Helper ─────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClientNotifications() {
  const { navigateTopLevel } = useNavigation();
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications();
        const backendNotifs: BackendNotification[] = res.data.data;
        console.log('ClientNotifications - raw:', backendNotifs);

        const displayNotifs: DisplayNotification[] = backendNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          time: formatTime(n.created_at),
          body: n.body,
          unread: n.unread,
          action: {
            label: n.action_label || 'View',
            page: n.action_page || '/',
          },
        }));

        setNotifications(displayNotifs);
      } catch (err: any) {
        // Gracefully handle 404 or non‑JSON responses (e.g., HTML from Django)
        if (
          err?.response?.status === 404 ||
          (err?.response?.data && typeof err.response.data !== 'object')
        ) {
          setNotifications([]);
        } else {
          console.error('Failed to load notifications:', err);
          setError('Could not load your notifications. Please try again later.');
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
        <Topbar title="Notifications" />
        <div className="loading-state">Loading notifications...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="client-notifications">
        <Topbar title="Notifications" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-notifications">
      <Topbar title="Notifications" />
      <section className="stack notifications-stack">
        {notifications.length === 0 && (
          <div className="box" style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
            No notifications.
          </div>
        )}
        {notifications.map((n) => (
          <article key={n.id} className={`box notification-card${n.unread ? ' unread' : ''}`}>
            <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3>{n.title}</h3>
              <span className="timestamp" style={{ color: 'var(--muted)', fontSize: 13 }}>
                {n.time}
              </span>
            </div>
            <p>{n.body}</p>
            <div className="notification-actions" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm${n.unread ? ' primary' : ''}`}
                onClick={() => navigateTopLevel(n.action.page)}
              >
                {n.action.label}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => dismiss(n.id)}>
                Dismiss
              </button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
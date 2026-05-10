import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

interface Notification {
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

export default function ClientNotifications() {
  const { navigateTopLevel } = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/notifications-client.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Notification[]) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        setError('Could not load your notifications. Please try again later.');
        setLoading(false);
      });
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
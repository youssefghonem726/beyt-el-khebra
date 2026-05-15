import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
// ─── Replace manual fetch with API service ────────────────────────────────
import { getNotifications } from '../../lib/api';

interface Notification {
  id: number;
  title: string;
  body: string;
}

export default function OwnerNotifications() {
  const { navigateTopLevel } = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getNotifications();
        // Data is inside res.data.data
        setNotifications(res.data.data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError('Could not load notifications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-notifications">
        <Topbar title="Notifications" />
        <section className="stack">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-notifications">
      <Topbar title="Notifications" />
      <section className="stack">
        {notifications.length === 0 ? (
          <div className="box" style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
            No notifications.
          </div>
        ) : (
          notifications.map((n) => (
            <article key={n.id} className="box">
              <h3>{n.title}</h3>
              <p>{n.body}</p>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

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
    fetch('/public/data/notifications.json')
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
        setError('Could not load notifications. Please try again later.');
        setLoading(false);
      });
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
        {notifications.map((n) => (
          <article key={n.id} className="box">
            <h3>{n.title}</h3>
            <p>{n.body}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
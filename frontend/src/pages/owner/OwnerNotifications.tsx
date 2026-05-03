import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

const NOTIFICATIONS = [
  { id: 1, title: 'Order #1021 quote is ready', body: 'Please review and confirm your quote to continue production.' },
  { id: 2, title: 'Order #1020 moved to production', body: 'Your order is now being printed.' },
  { id: 3, title: 'Invoice INV-9021 paid', body: 'Payment received successfully. Thank you.' },
];

export default function OwnerNotifications({ onNavigate }: Props) {
  return (
    <AppShell role="owner" activePage="owner-notifications" onNavigate={onNavigate}>
      <Topbar title="Notifications" userName="Client Name" />
      <section className="stack">
        {NOTIFICATIONS.map((n) => (
          <article key={n.id} className="box">
            <h3>{n.title}</h3>
            <p>{n.body}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

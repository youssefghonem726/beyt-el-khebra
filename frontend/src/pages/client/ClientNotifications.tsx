import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

const NOTIFICATIONS = [
  { id: 1, title: 'Order #1021 quote is ready', time: 'Today, 10:30 AM', body: 'Please review and confirm your quote to continue production. The quote is valid for 7 days.', unread: true, action: { label: 'Review Quote', page: 'quotes' } },
  { id: 2, title: 'Order #1020 moved to production', time: 'Yesterday, 02:15 PM', body: 'Your order is now being printed. Estimated completion: 24 Apr 2025.', unread: true, action: { label: 'Track Order', page: 'track-order' } },
  { id: 3, title: 'Invoice INV-9021 paid', time: '21 Apr 2025, 11:00 AM', body: 'Payment received successfully. Thank you for your business.', unread: false, action: { label: 'View Invoice', page: 'client-invoices' } },
  { id: 4, title: 'Order #1015 is ready for delivery', time: '14 Apr 2025, 09:45 AM', body: 'Your order has completed production and is out for delivery.', unread: false, action: { label: 'Track Delivery', page: 'track-order' } },
  { id: 5, title: 'Order #1012 delivery confirmed', time: '12 Apr 2025, 03:20 PM', body: 'Your order has been delivered successfully. We hope you are satisfied with the quality.', unread: false, action: { label: 'View Order', page: 'my-orders' } },
];

export default function ClientNotifications({ onNavigate }: Props) {
  return (
    <AppShell role="client" activePage="client-notifications" onNavigate={onNavigate}>
      <Topbar title="Notifications" userName="Ahmed Store" />
      <section className="stack notifications-stack">
        {NOTIFICATIONS.map((n) => (
          <article key={n.id} className={`box notification-card${n.unread ? ' unread' : ''}`}>
            <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3>{n.title}</h3>
              <span className="timestamp" style={{ color: 'var(--muted)', fontSize: 13 }}>{n.time}</span>
            </div>
            <p>{n.body}</p>
            <div className="notification-actions" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className={`btn btn-sm${n.unread ? ' primary' : ''}`} onClick={() => onNavigate(n.action.page)}>{n.action.label}</button>
              <button className="btn btn-sm btn-outline">Dismiss</button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

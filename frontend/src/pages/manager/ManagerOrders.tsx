import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface Props { role?: 'manager' | 'owner'; }

interface Order {
  id: string;
  clientId: string;
  status: string;
  orderDate: string;
  deliveryDate: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface DisplayOrder {
  id: string;      // full ID (e.g., ORD-1033-2026)
  displayId: string; // short display (#1033)
  status: string;
  client: string;
  completedAt?: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getShortId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

export default function ManagerOrders({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [pending, setPending] = useState<DisplayOrder[]>([]);
  const [working, setWorking] = useState<DisplayOrder[]>([]);
  const [completed, setCompleted] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([ordersData, clientsData]) => {
        const orders: Order[] = ordersData;
        const clients: Client[] = clientsData;
        const clientsMap: Record<string, string> = {};
        clients.forEach(c => { clientsMap[c.id] = c.name; });

        const displayOrders: DisplayOrder[] = orders.map(order => ({
          id: order.id,
          displayId: getShortId(order.id),
          status: order.status,
          client: clientsMap[order.clientId] || 'Unknown Client',
          completedAt: order.status === 'completed' || order.status === 'canceled' 
            ? (order.deliveryDate ? formatDate(order.deliveryDate) : formatDate(order.orderDate))
            : undefined,
        }));

        setPending(displayOrders.filter(o => 
          o.status === 'unpriced_pending' || o.status === 'priced_pending_confirmation'
        ));
        setWorking(displayOrders.filter(o => o.status === 'in_progress'));
        setCompleted(displayOrders.filter(o => 
          o.status === 'completed' || o.status === 'canceled'
        ));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError('Could not load orders. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'}>
        <Topbar title="All Orders" />
        <div className="loading-state">Loading orders…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'}>
        <Topbar title="All Orders" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'}>
      <Topbar title="All Orders" />

      <section className="grid-2">
        <article className="table-wrap">
          <div className="table-head"><h3>Pending Orders</h3></div>
          <table className="orders-table">
            <thead>
              <tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr>
            </thead>
            <tbody>
              {pending.map((o) => (
                <tr key={o.id}>
                  <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => navigateTopLevel(`/manager/orders/${o.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={4} className="no-results">No pending orders</td></tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="table-wrap">
          <div className="table-head"><h3>Working Orders</h3></div>
          <table className="orders-table">
            <thead>
              <tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr>
            </thead>
            <tbody>
              {working.map((o) => (
                <tr key={o.id}>
                  <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => navigateTopLevel('/manager/work-view')}
                    >
                      Work View
                    </button>
                  </td>
                </tr>
              ))}
              {working.length === 0 && (
                <tr><td colSpan={4} className="no-results">No working orders</td></tr>
              )}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-wrap" style={{ marginTop: 12 }}>
        <div className="table-head"><h3>Completed Orders</h3></div>
        <table className="orders-table">
          <thead>
            <tr><th>Order</th><th>Status</th><th>Client</th><th>Completed At</th><th>Action</th></tr>
          </thead>
          <tbody>
            {completed.map((o) => (
              <tr key={o.id}>
                <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt || '—'}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => navigateTopLevel(`/manager/orders/${o.id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {completed.length === 0 && (
              <tr><td colSpan={5} className="no-results">No completed orders</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
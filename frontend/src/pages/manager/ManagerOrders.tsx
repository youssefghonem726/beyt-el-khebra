import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

interface DisplayOrder {
  id: string;          // full numeric ID as string
  displayId: string;   // "#123"
  status: string;
  client: string;
  completedAt?: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getShortId(id: number): string {
  return `#${id}`;
}

export default function ManagerOrders({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [pending, setPending] = useState<DisplayOrder[]>([]);
  const [working, setWorking] = useState<DisplayOrder[]>([]);
  const [completed, setCompleted] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orders and clients in parallel
        const [ordersRes, clientsRes] = await Promise.all([
          getOrders(),
          getClients(),
        ]);

        const orders: any[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        console.log('ManagerOrders - orders:', orders);
        console.log('ManagerOrders - clients:', clients);

        // Build client name map (user ID → name)
        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

        const displayOrders: DisplayOrder[] = orders.map((order: any) => ({
          id: String(order.id),
          displayId: getShortId(order.id),
          status: order.status,
          client: clientMap.get(order.customer) || 'Unknown',
          completedAt:
            order.status === 'COMPLETED' || order.status === 'CANCELED'
              ? formatDate(order.updated_at)
              : undefined,
        }));

        // Split into groups based on real statuses (all uppercase)
        setPending(
          displayOrders.filter(o =>
            o.status === 'UNPRICED_PENDING' || o.status === 'PRICED_PENDING_CONFIRMATION'
          )
        );
        setWorking(displayOrders.filter(o => o.status === 'IN_PROGRESS'));
        setCompleted(
          displayOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELED')
        );
      } catch (err: any) {
        console.error('Failed to load orders:', err);
        setError('Could not load orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
                  <td>
                    {o.displayId}{' '}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span>
                  </td>
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
                  <td>
                    {o.displayId}{' '}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span>
                  </td>
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
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Client</th>
              <th>Completed At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.displayId}{' '}
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span>
                </td>
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
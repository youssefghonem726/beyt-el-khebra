import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface Props { role?: 'manager' | 'owner'; }

interface Order {
  id: string;
  status: string;
  client: string;
  completedAt?: string;
}

interface OrdersData {
  pending: Order[];
  working: Order[];
  completed: Order[];
}

export default function ManagerOrders({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [data, setData] = useState<OrdersData | null>(null);

  useEffect(() => {
    fetch('/data/manager-orders.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load orders: ${res.status}`);
        return res.json() as Promise<OrdersData>;
      })
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'}>
      <Topbar title="All Orders" />
      <div className="loading-state">Loading orders…</div>
    </AppShell>
  );

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'}>
      <Topbar title="All Orders" />

      <section className="grid-2">
        <article className="table-wrap">
          <div className="table-head"><h3>Pending Orders</h3></div>
          <table>
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {data.pending.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => navigateTopLevel(`/manager/orders/${o.id.replace('#', '')}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="table-wrap">
          <div className="table-head"><h3>Working Orders</h3></div>
          <table>
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {data.working.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
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
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-wrap" style={{ marginTop: 12 }}>
        <div className="table-head"><h3>Completed Orders</h3></div>
        <table>
          <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Completed At</th><th>Action</th></tr></thead>
          <tbody>
            {data.completed.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => navigateTopLevel(`/manager/orders/${o.id.replace('#', '')}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

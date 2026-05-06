import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; role?: 'manager' | 'owner'; }

const PENDING = [
  { id: '#1033', status: 'UNPRICED',         client: 'Client Name' },
  { id: '#1031', status: 'PENDING APPROVAL', client: 'Design Hub'  },
];
const WORKING = [
  { id: '#1029', status: 'IN_PROGRESS', client: 'Retail Plus'   },
  { id: '#1026', status: 'FINISHING',   client: 'Marketing Co.' },
];
const COMPLETED = [
  { id: '#1024', status: 'COMPLETED', client: 'Client Name', completedAt: '26 Apr 2026, 6:10 PM' },
  { id: '#1020', status: 'COMPLETED', client: 'Ahmed Store',  completedAt: '26 Apr 2026, 4:45 PM' },
];

export default function ManagerOrders({ onNavigate, role = 'manager' }: Props) {
  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'manager-orders'} onNavigate={onNavigate}>
      <Topbar title="All Orders" userName="Manager" />

      <section className="grid-2">
        <article className="table-wrap">
          <div className="table-head"><h3>Pending Orders</h3></div>
          <table>
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {PENDING.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => onNavigate(`manager-order-details-${o.id.replace('#', '')}`)}
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
              {WORKING.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => onNavigate(`work-view-${o.id.replace('#', '')}`)}
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
            {COMPLETED.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => onNavigate(`manager-order-details-${o.id.replace('#', '')}`)}
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

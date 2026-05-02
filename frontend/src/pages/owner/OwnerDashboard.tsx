import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

const QUICK_LISTS = [
  { list: 'Pending Orders', count: 8, status: 'AWAITING WORK', action: 'Review and price urgent batches', page: 'manager-orders' },
  { list: 'Working Orders', count: 12, status: 'IN PRODUCTION', action: 'Track production progress', page: 'owner-production' },
  { list: 'Completed Orders', count: 27, status: 'READY FOR ARCHIVE', action: 'Validate completion and billing', page: 'completed-jobs' },
];

export default function OwnerDashboard({ onNavigate }: Props) {
  return (
    <AppShell role="owner" activePage="owner-dashboard" onNavigate={onNavigate}>
      <Topbar title="Owner Dashboard" userName="Owner" />

      <section className="welcome">
        <h2>Operations snapshot</h2>
        <p>Monitor order flow, production load, and accounting status.</p>
      </section>

      <section className="grid-4">
        <StatCard label="Unpriced Orders" value={5} sub="Need manager pricing" />
        <StatCard label="Active Jobs" value={12} sub="Production in progress" />
        <StatCard label="Revenue Snapshot" value="EGP 84K" sub="This month booked" />
        <StatCard label="Accounting Items" value={9} sub="Need finance follow-up" />
      </section>

      <section className="content">
        <article className="table-wrap">
          <div className="table-head">
            <h3>Manager Quick Lists</h3>
            <div className="actions-inline">
              <button className="btn" onClick={() => onNavigate('manager-orders')}>Open Manager Orders</button>
              <button className="btn primary" onClick={() => onNavigate('accounting')}>Go to Accounting</button>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>List</th><th>Count</th><th>Status</th><th>Owner Action</th><th>Action</th></tr>
            </thead>
            <tbody>
              {QUICK_LISTS.map((r) => (
                <tr key={r.list}>
                  <td>{r.list}</td>
                  <td>{r.count}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.action}</td>
                  <td><button className="btn" onClick={() => onNavigate(r.page)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>Quick Actions</h3>
            <button className="btn block" onClick={() => onNavigate('manager-order-details')}>Open Order Details</button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('batch-lookup')}>Batch Lookup and Export</button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('owner-settings')}>Update Roles &amp; Notifications</button>
          </section>
          <section className="box">
            <h3>Accounting Redirect</h3>
            <ul>
              <li>Revenue section links directly to the accounting page.</li>
              <li>Invoices are managed under accounting records.</li>
              <li>Owner dashboard is now focused on operations and finance routing.</li>
            </ul>
          </section>
        </div>
      </section>
    </AppShell>
  );
}

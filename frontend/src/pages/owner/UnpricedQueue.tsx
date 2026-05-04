import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';

interface Props { onNavigate: (page: string) => void; }

const JOBS = [
  { id: 'Order #1021', client: 'Ahmed Store', product: 'Business Cards', qty: 1000, deadline: '24 Apr 2025' },
  { id: 'Order #1022', client: 'Client Name', product: 'Flyers', qty: 500, deadline: '25 Apr 2025' },
  { id: 'Order #1023', client: 'Retail Plus', product: 'Brochures', qty: 200, deadline: '26 Apr 2025' },
];

export default function UnpricedQueue({ onNavigate }: Props) {
  return (
    <AppShell role="owner" activePage="unpriced-queue" onNavigate={onNavigate}>
      <Topbar title="Unpriced Queue" userName="Admin" />
      <section className="grid-4">
        <StatCard label="Total Unpriced" value={3} sub="Jobs waiting for pricing" />
        <StatCard label="Due Soon" value={2} sub="Due within 3 days" />
        <StatCard label="Overdue" value={0} sub="No overdue jobs" />
        <StatCard label="Average Processing" value="1.3d" sub="Average queue time" />
      </section>
      <section className="table-wrap">
        <div className="table-head">
          <h3>Unpriced Jobs</h3>
          <button className="btn" onClick={() => onNavigate('owner-dashboard')}>Back to Dashboard</button>
        </div>
        <div className="stack">
          {JOBS.map((j) => (
            <article key={j.id} className="card">
              <h4>{j.id}</h4>
              <p><strong>Client:</strong> {j.client}</p>
              <p><strong>Product:</strong> {j.product}</p>
              <p><strong>Quantity:</strong> {j.qty}</p>
              <p><strong>Status:</strong> Unpriced</p>
              <p><strong>Deadline:</strong> {j.deadline}</p>
              <div className="card-actions">
                <button className="btn" onClick={() => onNavigate('edit-order')}>Price</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

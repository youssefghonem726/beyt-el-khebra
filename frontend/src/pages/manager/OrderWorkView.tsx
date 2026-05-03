import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

const JOBS = [
  {
    id: 'Job #1022', done: 600, total: 1000, percent: 60,
    stages: [{ stage: 'Prepress', status: 'DONE', updated: '26 Apr 2026, 9:00 AM' }, { stage: 'Printing', status: 'IN_PROGRESS', updated: '26 Apr 2026, 4:20 PM' }, { stage: 'Finishing', status: 'WAITING', updated: '-' }],
    info: { client: 'Client Name', batch: 'B-260425-M', product: 'Business Cards', qty: 1000, status: 'In Progress', priority: 'High', deadline: '28 Apr 2026', team: 'Production Team A', notes: 'Standard business cards, double-sided' },
  },
  {
    id: 'Job #1023', done: 300, total: 500, percent: 60,
    stages: [{ stage: 'Prepress', status: 'DONE', updated: '26 Apr 2026, 10:00 AM' }, { stage: 'Printing', status: 'IN_PROGRESS', updated: '27 Apr 2026, 2:00 PM' }, { stage: 'Finishing', status: 'WAITING', updated: '-' }],
    info: { client: 'Another Client', batch: 'B-260426-A', product: 'Flyers', qty: 500, status: 'Waiting', priority: 'Medium', deadline: '27 Apr 2026', team: 'Production Team B', notes: 'A5 flyers, full color' },
  },
  {
    id: 'Job #1024', done: 0, total: 200, percent: 0,
    stages: [{ stage: 'Prepress', status: 'WAITING', updated: '-' }, { stage: 'Printing', status: 'WAITING', updated: '-' }, { stage: 'Finishing', status: 'WAITING', updated: '-' }],
    info: { client: 'Client X', batch: 'B-260427-X', product: 'Brochures', qty: 200, status: 'Planned', priority: 'Low', deadline: '30 Apr 2026', team: 'Production Team C', notes: 'Tri-fold brochures, urgent delivery' },
  },
];

export default function OrderWorkView({ onNavigate }: Props) {
  return (
    <AppShell role="manager" activePage="order-work-view" onNavigate={onNavigate}>
      <Topbar title="Order Work View" userName="Production" />
      {JOBS.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress - {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed ({j.percent}%)</p>
            <ProgressBar percent={j.percent} style={{ margin: '8px 0 14px' }} />
            <table>
              <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
              <tbody>
                {j.stages.map((s) => (
                  <tr key={s.stage}><td>{s.stage}</td><td><StatusBadge status={s.status} /></td><td>{s.updated}</td></tr>
                ))}
              </tbody>
            </table>
          </article>
          <aside className="box">
            <h3>Job Info</h3>
            <ul>
              <li>Client Name: {j.info.client}</li>
              <li>Batch Code: {j.info.batch}</li>
              <li>Product: {j.info.product}</li>
              <li>Quantity: {j.info.qty}</li>
              <li>Status: {j.info.status}</li>
              <li>Priority: {j.info.priority}</li>
              <li>Deadline: {j.info.deadline}</li>
              <li>Assigned To: {j.info.team}</li>
              <li>Notes: {j.info.notes}</li>
            </ul>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}

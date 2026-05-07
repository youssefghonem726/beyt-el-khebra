import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; jobId?: string; role?: 'manager' | 'owner'; }

const JOBS = [
  {
    id: 'Job #1022', done: 600, total: 1000, percent: 60,
    stages: [
      { stage: 'Prepress',  status: 'DONE',        updated: '26 Apr 2026, 9:00 AM'  },
      { stage: 'Printing',  status: 'IN_PROGRESS',  updated: '26 Apr 2026, 4:20 PM'  },
      { stage: 'Finishing', status: 'WAITING',      updated: '-'                      },
    ],
    info: { client: 'Client Name', batch: 'B-260425-M', product: 'Business Cards', qty: 1000, status: 'In Progress', priority: 'High', deadline: '28 Apr 2026', team: 'Production Team A', notes: 'Standard business cards, double-sided' },
  },
  {
    id: 'Job #1021', done: 1200, total: 2000, percent: 60,
    stages: [
      { stage: 'Prepress',  status: 'DONE',        updated: '25 Apr 2026, 8:00 AM'  },
      { stage: 'Printing',  status: 'IN_PROGRESS',  updated: '25 Apr 2026, 3:00 PM'  },
      { stage: 'Finishing', status: 'WAITING',      updated: '-'                      },
    ],
    info: { client: 'Design Hub', batch: 'B-260425-D', product: 'Flyers', qty: 2000, status: 'In Progress', priority: 'High', deadline: '25 Apr 2026', team: 'Production Team B', notes: 'A5 flyers, full color' },
  },
  {
    id: 'Job #1029', done: 150, total: 300, percent: 50,
    stages: [
      { stage: 'Prepress',  status: 'DONE',        updated: '27 Apr 2026, 9:00 AM'  },
      { stage: 'Printing',  status: 'IN_PROGRESS',  updated: '27 Apr 2026, 1:00 PM'  },
      { stage: 'Finishing', status: 'WAITING',      updated: '-'                      },
    ],
    info: { client: 'Retail Plus', batch: 'B-260427-R', product: 'Catalogs', qty: 300, status: 'In Progress', priority: 'Medium', deadline: '29 Apr 2026', team: 'Production Team A', notes: 'Full color catalog, A4 format' },
  },
  {
    id: 'Job #1026', done: 800, total: 1000, percent: 80,
    stages: [
      { stage: 'Prepress',  status: 'DONE',        updated: '26 Apr 2026, 11:00 AM' },
      { stage: 'Printing',  status: 'DONE',        updated: '26 Apr 2026, 5:00 PM'  },
      { stage: 'Finishing', status: 'IN_PROGRESS',  updated: '27 Apr 2026, 8:00 AM'  },
    ],
    info: { client: 'Marketing Co.', batch: 'B-260426-MK', product: 'Posters', qty: 1000, status: 'Finishing', priority: 'High', deadline: '27 Apr 2026', team: 'Production Team C', notes: 'A2 posters, glossy finish' },
  },
];

export default function OrderWorkView({ onNavigate, jobId, role = 'manager' }: Props) {
  const displayed = jobId
    ? JOBS.filter(j => j.id === `Job #${jobId}`)
    : JOBS;

  const title = displayed.length === 1
    ? `Work View — ${displayed[0].id}`
    : 'Order Work View';

  if (jobId && displayed.length === 0) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'} onNavigate={onNavigate}>
        <Topbar title="Work View" />
        <div className="error-state">Job not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'} onNavigate={onNavigate}>
      <Topbar title={title} />
      {displayed.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress — {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed ({j.percent}%)</p>
            <ProgressBar percent={j.percent} style={{ margin: '8px 0 14px' }} />
            <table>
              <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
              <tbody>
                {j.stages.map((s) => (
                  <tr key={s.stage}>
                    <td>{s.stage}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <aside className="box">
            <h3>Job Info</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>Client:</strong> {j.info.client}</li>
              <li><strong>Batch Code:</strong> {j.info.batch}</li>
              <li><strong>Product:</strong> {j.info.product}</li>
              <li><strong>Quantity:</strong> {j.info.qty}</li>
              <li><strong>Status:</strong> {j.info.status}</li>
              <li><strong>Priority:</strong> {j.info.priority}</li>
              <li><strong>Deadline:</strong> {j.info.deadline}</li>
              <li><strong>Assigned To:</strong> {j.info.team}</li>
              <li><strong>Notes:</strong> {j.info.notes}</li>
            </ul>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}

import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface Props { role?: 'manager' | 'owner'; }

const JOBS = [
  {
    id: 'Order #1024', done: 1500, total: 1500,
    stages: [{ stage: 'Prepress', status: 'DONE', updated: '26 Apr 2026, 9:00 AM' }, { stage: 'Printing', status: 'DONE', updated: '27 Apr 2026, 2:00 PM' }, { stage: 'Finishing', status: 'DONE', updated: '27 Apr 2026, 6:10 PM' }],
    info: { client: 'Client Name', batch: 'B-260425-M', product: 'Packaging Sleeves', qty: 1500, status: 'Completed', priority: 'High', deadline: '28 Apr 2026', team: 'Production Team A', completion: '27 Apr 2026', notes: 'Completed on time' },
  },
  {
    id: 'Order #1023', done: 800, total: 800,
    stages: [{ stage: 'Prepress', status: 'DONE', updated: '26 Apr 2026, 10:00 AM' }, { stage: 'Printing', status: 'DONE', updated: '27 Apr 2026, 1:00 PM' }, { stage: 'Finishing', status: 'DONE', updated: '27 Apr 2026, 4:45 PM' }],
    info: { client: 'Retail Plus', batch: 'B-260426-R', product: 'Stickers', qty: 800, status: 'Completed', priority: 'Medium', deadline: '27 Apr 2026', team: 'Production Team B', completion: '27 Apr 2026', notes: 'Completed ahead of schedule' },
  },
];

export default function CompletedJobs({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  
  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'completed-jobs'}>
      <Topbar title="Completed Jobs" />
      {JOBS.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress - {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
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
              <li>Completion Date: {j.info.completion}</li>
              <li>Notes: {j.info.notes}</li>
            </ul>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}
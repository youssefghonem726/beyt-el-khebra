import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface Stage {
  stage: string;
  status: string;
  updated: string;
}

interface JobInfo {
  client: string;
  batch: string;
  product: string;
  qty: number;
  status: string;
  priority: string;
  deadline: string;
  team: string;
  notes: string;
}

interface Job {
  id: string;
  done: number;
  total: number;
  percent: number;
  stages: Stage[];
  info: JobInfo;
}

interface Props { jobId?: string; role?: 'manager' | 'owner'; }

export default function OrderWorkView({ jobId, role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/work-jobs.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`);
        return res.json() as Promise<Job[]>;
      })
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const displayed = jobId
    ? jobs.filter((j) => j.id === `Job #${jobId}`)
    : jobs;

  const title = displayed.length === 1
    ? `Work View — ${displayed[0].id}`
    : 'Order Work View';

  if (loading) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="loading-state">Loading jobs…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  if (jobId && displayed.length === 0) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="error-state">Job not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
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

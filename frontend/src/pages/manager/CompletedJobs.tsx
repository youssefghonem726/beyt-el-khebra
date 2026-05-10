import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface Props { role?: 'manager' | 'owner'; }

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
  completion: string;
  notes: string;
}

interface Job {
  id: string;
  done: number;
  total: number;
  stages: Stage[];
  info: JobInfo;
}

export default function CompletedJobs({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/completed-jobs.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Job[]) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load completed jobs:', err);
        setError('Could not load completed jobs data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'completed-jobs'}>
        <Topbar title="Completed Jobs" />
        <div className="loading-state">Loading completed jobs...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'completed-jobs'}>
        <Topbar title="Completed Jobs" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'completed-jobs'}>
      <Topbar title="Completed Jobs" />
      {jobs.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress - {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
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
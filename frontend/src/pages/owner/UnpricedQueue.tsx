import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';

interface Props { onNavigate: (page: string) => void; }

interface UnpricedJob {
  id: string;
  client: string;
  product: string;
  qty: number;
  deadline: string;
}

export default function UnpricedQueue({ onNavigate }: Props) {
  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/unpriced-jobs.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: UnpricedJob[]) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load unpriced jobs:', err);
        setError('Could not load unpriced queue data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
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
          </div>
          <div className="loading-state">Loading jobs...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
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
          </div>
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

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
          {jobs.map((j) => (
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
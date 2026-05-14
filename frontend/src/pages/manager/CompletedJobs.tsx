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
  updated: string;   // formatted date for display
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

// Types from normalized JSON
interface Batch {
  id: string;
  orderId: string;
  clientId: string;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo: string | null;
  deadline: string | null;
  status: string;
  stages: Array<{ stage: string; status: string; updatedAt: string | null }>;
  notes: string;
}

interface Order {
  id: string;
  orderDate: string;
}

interface Client {
  id: string;
  name: string;
}

// Helper: format ISO date to "DD MMM YYYY" or custom format (with time)
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CompletedJobs({ role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([batchesRaw, ordersRaw, clientsRaw]) => {
        // Build lookup maps
        const ordersMap: Record<string, Order> = {};
        ordersRaw.forEach((o: Order) => { ordersMap[o.id] = o; });
        const clientsMap: Record<string, Client> = {};
        clientsRaw.forEach((c: Client) => { clientsMap[c.id] = c; });

        // Filter completed batches
        const completedBatches = batchesRaw.filter((b: Batch) => b.status === 'completed');

        const jobList: Job[] = completedBatches.map((batch: Batch) => {
          const order = ordersMap[batch.orderId];
          const client = clientsMap[batch.clientId];
          const completionDate = order ? formatDate(order.orderDate) : '—'; // fallback, but we might use batch.deadline? Actually completion date is when order completed – we don't have a dedicated field. Use deadline or order date.
          // For consistency with original, we can assume completion = deadline (or orderDate if no deadline). Original used a "completion" field; we'll use the batch.deadline if present, else order date.
          const completion = batch.deadline ? formatDate(batch.deadline) : (order ? formatDate(order.orderDate) : '—');

          // Transform stages: format updatedAt timestamps
          const stages: Stage[] = (batch.stages || []).map(s => ({
            stage: s.stage,
            status: s.status,
            updated: s.updatedAt ? formatDateTime(s.updatedAt) : '—'
          }));

          const info: JobInfo = {
            client: client ? client.name : 'Unknown',
            batch: batch.id,
            product: batch.product,
            qty: batch.qty,
            status: 'completed',  // all are completed
            priority: batch.priority,
            deadline: batch.deadline ? formatDate(batch.deadline) : '—',
            team: batch.assignedTo || 'Unassigned',
            completion,
            notes: batch.notes || '—'
          };

          return {
            id: batch.id,  // Use batch id as the job id (original had "Order #1024")
            done: batch.progress,  // For completed, progress should equal qty
            total: batch.qty,
            stages,
            info
          };
        });

        setJobs(jobList);
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
            <table className="orders-table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Stage</th><th>Status</th><th>Updated At</th></tr>
              </thead>
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
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li><strong>Client Name:</strong> {j.info.client}</li>
              <li><strong>Batch Code:</strong> {j.info.batch}</li>
              <li><strong>Product:</strong> {j.info.product}</li>
              <li><strong>Quantity:</strong> {j.info.qty}</li>
              <li><strong>Status:</strong> {j.info.status}</li>
              <li><strong>Priority:</strong> {j.info.priority}</li>
              <li><strong>Deadline:</strong> {j.info.deadline}</li>
              <li><strong>Assigned To:</strong> {j.info.team}</li>
              <li><strong>Completion Date:</strong> {j.info.completion}</li>
              <li><strong>Notes:</strong> {j.info.notes}</li>
            </ul>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}
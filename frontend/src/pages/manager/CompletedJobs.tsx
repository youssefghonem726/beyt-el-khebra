import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

// ─── Backend shapes ─────────────────────────────────────────────────
interface BackendBatch {
  id: number;
  orderId: number;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo?: string | null;
  deadline?: string | null;
  status: string;
  stages?: { stage: string; status: string; updatedAt?: string }[];
  notes?: string;
}

interface BackendOrder {
  id: number;
  customer: number;
  created_at?: string;
}

// ─── Display shapes ────────────────────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────────
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
    const fetchData = async () => {
      try {
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);

        const batchesRaw: BackendBatch[] = batchesRes.data.data;
        const orders: BackendOrder[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        console.log('CompletedJobs - batches:', batchesRaw);
        console.log('CompletedJobs - orders:', orders);
        console.log('CompletedJobs - clients:', clients);

        // Build lookup maps
        const orderMap = new Map(orders.map(o => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c]));

        // Filter completed batches
        const completedBatches = batchesRaw.filter((b: BackendBatch) => b.status === 'completed');

        const jobList: Job[] = completedBatches.map((batch: BackendBatch) => {
          const order = orderMap.get(batch.orderId);
          const client = order ? clientMap.get(order.customer) : null;

          // Completion date: use batch.deadline if available, otherwise order created_at
          const completion = batch.deadline ? formatDate(batch.deadline) : (order?.created_at ? formatDate(order.created_at) : '—');

          // Transform stages
          const stages: Stage[] = (batch.stages || []).map(s => ({
            stage: s.stage,
            status: s.status,
            updated: s.updatedAt ? formatDateTime(s.updatedAt) : '—',
          }));

          const info: JobInfo = {
            client: client ? client.name : 'Unknown',
            batch: String(batch.id),
            product: batch.product,
            qty: batch.qty,
            status: 'completed',
            priority: batch.priority,
            deadline: batch.deadline ? formatDate(batch.deadline) : '—',
            team: batch.assignedTo || 'Unassigned',
            completion,
            notes: batch.notes || '—',
          };

          return {
            id: String(batch.id),
            done: batch.progress,
            total: batch.qty,
            stages,
            info,
          };
        });

        setJobs(jobList);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setJobs([]);
        } else {
          console.error('Failed to load completed jobs:', err);
          setError('Could not load completed jobs data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      {jobs.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No completed jobs yet.</p>
      )}
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
                {j.stages.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>No stage details</td></tr>
                ) : (
                  j.stages.map((s) => (
                    <tr key={s.stage}>
                      <td>{s.stage}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>{s.updated}</td>
                    </tr>
                  ))
                )}
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
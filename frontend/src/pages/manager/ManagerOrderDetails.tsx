import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrderById } from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

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
  stages: Stage[];
  info: JobInfo;
}

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

export default function ManagerOrderDetails() {
  const { id: orderId } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const numericId = parseInt(orderId, 10);
        if (isNaN(numericId)) {
          setError(`Invalid order ID: ${orderId}`);
          setLoading(false);
          return;
        }

        let order;
        try {
          const orderRes = await getOrderById(numericId);
          order = orderRes.data.data;
        } catch (orderErr: any) {
          if (orderErr?.response?.status === 404) {
            setError(`Order #${numericId} not found.`);
            setLoading(false);
            return;
          }
          throw orderErr;
        }

        const [batchesRes, clientsRes] = await Promise.all([
          getBatches(),
          getClients(),
        ]);

        const batches = batchesRes.data.data || [];
        const clients = clientsRes.data.data.results;

        const batch = batches.find((b: any) => b.orderId === order.id || b.order_id === order.id);
        const client = clients.find((c: any) => c.id === order.customer_id);
        const clientName = client?.name || 'Unknown';

        const product = batch?.product || `Order #${order.id}`;
        const qty = batch?.qty ?? (order.quantity ?? 0);
        const progress = batch?.progress ?? (order.status === 'COMPLETED' ? qty : 0);
        const stages = (batch?.stages || []).map((s: any) => ({
          stage: s.stage,
          status: s.status,
          updated: s.updatedAt ? formatDateTime(s.updatedAt) : '—',
        }));

        const jobInfo: JobInfo = {
          client: clientName,
          batch: batch ? String(batch.id) : '—',
          product,
          qty,
          status: order.status,
          priority: order.Priority || batch?.priority || 'Normal',
          deadline: order.due_date ? formatDate(order.due_date) : (batch?.deadline ? formatDate(batch.deadline) : '—'),
          team: batch?.assignedTo || 'Unassigned',
          notes: order.Notes || batch?.notes || '—',
        };

        setJob({
          id: String(order.id),
          done: progress,
          total: qty,
          stages,
          info: jobInfo,
        });
      } catch (err: any) {
        console.error('Failed to load order details:', err);
        setError('Could not load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const pct = (j: Job) => j.total > 0 ? Math.round((j.done / j.total) * 100) : 0;

  if (loading) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title="Order Details" />
        <div className="loading-state">Loading order details...</div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title="Order Details" />
        <div className="error-state">{error || 'Order not found.'}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={`Order #${job.id}`} />

      <section className="split" style={{ marginBottom: 14 }}>
        <article className="box">
          <h3>Work Progress - {job.id}</h3>
          <p><strong>{job.done} / {job.total}</strong> completed ({pct(job)}%)</p>
          <ProgressBar percent={pct(job)} color={pct(job) === 100 ? 'green' : pct(job) >= 50 ? 'orange' : undefined} style={{ margin: '8px 0 14px' }} />
          <table className="orders-table" style={{ width: '100%' }}>
            <thead>
              <tr><th>Stage</th><th>Status</th><th>Updated At</th></tr>
            </thead>
            <tbody>
              {job.stages.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>No stage details</td></tr>
              ) : (
                job.stages.map((s) => (
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
            <li><strong>Client Name:</strong> {job.info.client}</li>
            <li><strong>Batch Code:</strong> {job.info.batch}</li>
            <li><strong>Product:</strong> {job.info.product}</li>
            <li><strong>Quantity:</strong> {job.info.qty}</li>
            <li><strong>Status:</strong> <StatusBadge status={job.info.status} /></li>
            <li><strong>Priority:</strong> {job.info.priority}</li>
            <li><strong>Deadline:</strong> {job.info.deadline}</li>
            <li><strong>Assigned To:</strong> {job.info.team}</li>
            <li><strong>Notes:</strong> {job.info.notes}</li>
          </ul>
          <div className="line" />
          <button className="btn primary block" onClick={() => setShowWorkView(true)}>Open Work View</button>
        </aside>
      </section>

      {showWorkView && job && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '32px 16px', overflowY: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowWorkView(false); }}
        >
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: 12,
            width: '100%', maxWidth: 680,
            boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid var(--border, #e4e6eb)',
              position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 1,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Work View — Order #{job.id}</h2>
              <button
                onClick={() => setShowWorkView(false)}
                style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{job.info.client} · {job.info.product}</p>
              <ProgressBar percent={pct(job)} color={pct(job) === 100 ? 'green' : pct(job) >= 50 ? 'orange' : undefined} />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 18 }}>
                {job.done} / {job.total} printed ({pct(job)}%)
              </p>

              {job.stages.length > 0 ? (
                <>
                  <h4 style={{ marginBottom: 10 }}>Production Stages</h4>
                  <table style={{ marginBottom: 20 }}>
                    <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
                    <tbody>
                      {job.stages.map((s) => (
                        <tr key={s.stage}>
                          <td>{s.stage}</td>
                          <td><StatusBadge status={s.status} /></td>
                          <td>{s.updated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No stage details available.</p>
              )}

              <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                <p><strong>Client:</strong> {job.info.client}</p>
                <p><strong>Batch:</strong> {job.info.batch}</p>
                <p><strong>Product:</strong> {job.info.product}</p>
                <p><strong>Quantity:</strong> {job.info.qty} pcs</p>
                <p><strong>Priority:</strong> {job.info.priority}</p>
                <p><strong>Deadline:</strong> {job.info.deadline}</p>
                <p><strong>Assigned To:</strong> {job.info.team}</p>
              </div>
              {job.info.notes !== '—' && (
                <p style={{ marginTop: 8 }}><strong>Notes:</strong> {job.info.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
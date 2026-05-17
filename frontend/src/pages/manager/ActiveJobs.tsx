import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

// ─── Backend types ─────────────────────────────────────────────────
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
  paper?: string;
}

interface BackendOrder {
  id: number;
  customer: number;
  product?: string;
  status: string;
  total_price?: number | null;
  upload?: { file_name?: string };
}

// ─── Display types ─────────────────────────────────────────────────
interface Job {
  id: string;
  client: string;
  product: string;
  qty: number;
  status: string;
  progress: number;
  dueDate: string;
  paper: string;
  batchCode: string;
  priority: string;
  assignedTo: string | null;
  notes: string;
  stages: { stage: string; status: string; updatedAt?: string }[];
}

// ─── Constants ────────────────────────────────────────────────────
const STEPS = [
  'File Approved',
  'Printing Started',
  'Finishing',
  'Quality Check',
  'Ready for Delivery',
];

function currentStep(pct: number): number {
  if (pct === 0)  return 0;
  if (pct < 25)   return 1;
  if (pct < 55)   return 2;
  if (pct < 80)   return 3;
  if (pct < 100)  return 4;
  return 5;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function normalizeStatus(batchStatus: string): string {
  switch (batchStatus) {
    case 'in_progress':
    case 'finishing':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'pending_approval':
    case 'unpriced':
      return 'on_hold';
    case 'canceled':
      return 'canceled';
    default:
      return batchStatus;
  }
}

export default function ActiveJobs() {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);

        const batches: BackendBatch[] = batchesRes.data.data;
        const orders: BackendOrder[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results; // paginated

        console.log('ActiveJobs - batches:', batches);
        console.log('ActiveJobs - orders:', orders);
        console.log('ActiveJobs - clients:', clients);

        // Build lookup maps
        const orderMap = new Map(orders.map(o => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

        const jobList: Job[] = batches.map((batch: BackendBatch) => {
          const order = orderMap.get(batch.orderId);
          const clientId = order?.customer;
          const clientName = clientId ? clientMap.get(clientId) || 'Unknown' : 'Unknown';
          const paper = batch.paper || order?.product || '—';

          return {
            id: String(batch.id),
            client: clientName,
            product: batch.product || order?.upload?.file_name || `Order #${batch.orderId}`,
            qty: batch.qty,
            status: normalizeStatus(batch.status),
            progress: batch.progress,
            dueDate: formatDate(batch.deadline),
            paper,
            batchCode: String(batch.id),
            priority: batch.priority,
            assignedTo: batch.assignedTo || null,
            notes: batch.notes || '',
            stages: (batch.stages || []).map(s => ({
              ...s,
              updatedAt: s.updatedAt || '—',
            })),
          };
        });

        setJobs(jobList);
        if (jobList.length > 0 && !selectedJob) setSelectedJob(jobList[0]);
      } catch (err: any) {
        // If endpoint not yet built, show empty state
        if (err?.response?.status === 404) {
          setJobs([]);
        } else {
          console.error('Failed to load production data:', err);
          setError('Could not load production data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pct = (j: Job) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;

  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'canceled').length;
  const inProgress = jobs.filter(j => j.status === 'in_progress').length;
  const onHold     = jobs.filter(j => j.status === 'on_hold').length;
  const completed  = jobs.filter(j => j.status === 'completed').length;

  const filtered = jobs.filter((j) => {
    const q = query.toLowerCase();
    const matchQ = !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
    const matchS = !filterStatus || j.status === filterStatus;
    return matchQ && matchS;
  });

  const progressColor = (p: number) =>
    p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

  if (loading) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title="Production Dashboard" />
        <div className="loading-state">Loading production data...</div>
      </AppShell>
    );
  }

  if (error || jobs.length === 0) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title="Production Dashboard" />
        <div className="error-state">{error ?? 'No jobs available.'}</div>
      </AppShell>
    );
  }

  const step = selectedJob ? currentStep(pct(selectedJob)) : 0;

  return (
    <AppShell role="manager" activePage="active-jobs">
      <Topbar title="Production Dashboard" />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs"  value={activeJobs} sub="Currently in queue"    />
        <StatCard label="In Progress"  value={inProgress} sub="Being worked on"       />
        <StatCard label="On Hold"      value={onHold}     sub="Waiting on something"  />
        <StatCard label="Completed"    value={completed}  sub="Finished jobs"         />
      </section>

      <section className="production-layout">
        {/* ── Job list ── */}
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>Active Jobs</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder="Search by job ID, client or product…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>Status</label>
                      <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="in_progress">In Progress</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>No matching jobs.</p>
              ) : filtered.map((j) => (
                <article
                  key={j.id}
                  className={`card${selectedJob?.id === j.id ? ' card--selected' : ''}`}
                  onClick={() => setSelectedJob(j)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4>{j.id}</h4>
                    <StatusBadge status={j.status} />
                  </div>
                  <p style={{ marginBottom: 2 }}><strong>Client:</strong> {j.client}</p>
                  <p style={{ marginBottom: 2 }}><strong>Product:</strong> {j.product} — {j.qty} pcs</p>
                  <p style={{ marginBottom: 6 }}><strong>Due:</strong> {j.dueDate}</p>
                  <ProgressBar percent={pct(j)} color={progressColor(pct(j))} />
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                    {j.progress} / {j.qty} printed ({pct(j)}%)
                  </p>
                  <div className="card-actions">
                    <button
                      className="btn"
                      onClick={(e) => { e.stopPropagation(); setSelectedJob(j); setShowWorkView(true); }}
                    >
                      Open Work View
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        {/* ── Job detail panel ── */}
        {selectedJob && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selectedJob.id}</h3>
              <StatusBadge status={selectedJob.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selectedJob.client}</p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Job Details</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>Product:</strong> {selectedJob.product}</li>
              <li><strong>Quantity:</strong> {selectedJob.qty} pcs</li>
              <li><strong>Paper:</strong> {selectedJob.paper}</li>
              <li><strong>Due Date:</strong> {selectedJob.dueDate}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Progress</h4>
            <ProgressBar percent={pct(selectedJob)} color={progressColor(pct(selectedJob))} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selectedJob.progress} / {selectedJob.qty} ({pct(selectedJob)}%) complete
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Production Steps</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
              {STEPS.map((s, i) => {
                const done    = i < step;
                const current = i === step;
                return (
                  <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: done ? '#2c9a4b' : current ? '#2f3640' : '#e4e6eb',
                      color: done || current ? '#fff' : 'var(--muted)',
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{
                      fontWeight: current ? 600 : 400,
                      color: done ? '#2c9a4b' : current ? 'var(--text)' : 'var(--muted)',
                    }}>
                      {s}
                      {current && <span style={{ fontSize: 11, marginLeft: 6, color: '#e89023' }}>← current</span>}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="line" />

            <button className="btn primary block" style={{ marginTop: 4 }} onClick={() => setShowWorkView(true)}>
              Open Work View
            </button>
          </aside>
        )}
      </section>

      {showWorkView && selectedJob && (() => {
        const p = pct(selectedJob);
        const s = currentStep(p);
        return (
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
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Work View — {selectedJob.id}</h2>
                <button
                  onClick={() => setShowWorkView(false)}
                  style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  ✕ Close
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selectedJob.client} · {selectedJob.product}</p>
                <ProgressBar percent={p} color={p === 100 ? 'green' : p >= 50 ? 'orange' : undefined} />
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 18 }}>
                  {selectedJob.progress} / {selectedJob.qty} printed ({p}%)
                </p>

                {selectedJob.stages && selectedJob.stages.length > 0 ? (
                  <>
                    <h4 style={{ marginBottom: 10 }}>Production Stages</h4>
                    <table style={{ marginBottom: 20 }}>
                      <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
                      <tbody>
                        {selectedJob.stages.map(st => (
                          <tr key={st.stage}>
                            <td>{st.stage}</td>
                            <td><StatusBadge status={st.status} /></td>
                            <td>{st.updatedAt || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    <h4 style={{ marginBottom: 10 }}>Production Steps</h4>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginBottom: 20 }}>
                      {STEPS.map((name, i) => {
                        const done    = i < s;
                        const current = i === s;
                        return (
                          <li key={name} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              background: done ? '#2c9a4b' : current ? '#2f3640' : '#e4e6eb',
                              color: done || current ? '#fff' : 'var(--muted)',
                            }}>
                              {done ? '✓' : i + 1}
                            </span>
                            <span style={{ fontWeight: current ? 600 : 400, color: done ? '#2c9a4b' : current ? 'var(--text)' : 'var(--muted)' }}>
                              {name}
                              {current && <span style={{ fontSize: 11, marginLeft: 6, color: '#e89023' }}>← current</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                  <p><strong>Client:</strong> {selectedJob.client}</p>
                  <p><strong>Batch:</strong> {selectedJob.batchCode}</p>
                  <p><strong>Product:</strong> {selectedJob.product}</p>
                  <p><strong>Quantity:</strong> {selectedJob.qty} pcs</p>
                  <p><strong>Paper:</strong> {selectedJob.paper}</p>
                  <p><strong>Due Date:</strong> {selectedJob.dueDate}</p>
                  {selectedJob.priority   && <p><strong>Priority:</strong> {selectedJob.priority}</p>}
                  {selectedJob.assignedTo && <p><strong>Assigned To:</strong> {selectedJob.assignedTo}</p>}
                  {selectedJob.notes && <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selectedJob.notes}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
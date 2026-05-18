import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

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

const STEP_KEYS = [
  'File Approved',
  'Printing Started',
  'Finishing',
  'Quality Check',
  'Ready for Delivery',
] as const;

function currentStep(pct: number): number {
  if (pct === 0)   return 0;
  if (pct < 25)    return 1;
  if (pct < 55)    return 2;
  if (pct < 80)    return 3;
  if (pct < 100)   return 4;
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
  return (
    <Suspense fallback={null}>
      <ActiveJobsInner />
    </Suspense>
  );
}

function ActiveJobsInner() {
  const { t } = useTranslation(['common', 'activeJobs']);
  const { navigateTopLevel: _nav } = useNavigation();
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
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);

        const batches: BackendBatch[] = batchesRes.data.data;
        const orders: BackendOrder[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

        const jobList: Job[] = batches.map((batch) => {
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
            dueDate: formatDate(batch.deadline ?? null),
            paper,
            batchCode: String(batch.id),
            priority: batch.priority,
            assignedTo: batch.assignedTo || null,
            notes: batch.notes || '',
            stages: (batch.stages || []).map((s) => ({ ...s, updatedAt: s.updatedAt || '—' })),
          };
        });

        setJobs(jobList);
        if (jobList.length > 0 && !selectedJob) setSelectedJob(jobList[0]);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setJobs([]);
        } else {
          console.error('Failed to load production data:', err);
          setError(t('activeJobs:error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pct = (j: Job) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;

  const activeJobs = jobs.filter((j) => j.status !== 'completed' && j.status !== 'canceled').length;
  const inProgress = jobs.filter((j) => j.status === 'in_progress').length;
  const onHold     = jobs.filter((j) => j.status === 'on_hold').length;
  const completed  = jobs.filter((j) => j.status === 'completed').length;

  const filtered = jobs.filter((j) => {
    const q = query.toLowerCase();
    const matchQ = !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
    const matchS = !filterStatus || j.status === filterStatus;
    return matchQ && matchS;
  });

  const progressColor = (p: number) => p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

  if (loading) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title={t('activeJobs:title')} />
        <div className="loading-state">{t('activeJobs:loading')}</div>
      </AppShell>
    );
  }

  if (error || jobs.length === 0) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title={t('activeJobs:title')} />
        <div className="error-state">{error ?? t('activeJobs:empty')}</div>
      </AppShell>
    );
  }

  const step = selectedJob ? currentStep(pct(selectedJob)) : 0;

  return (
    <AppShell role="manager" activePage="active-jobs">
      <Topbar title={t('activeJobs:title')} />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('activeJobs:stats.activeJobs')} value={activeJobs} sub={t('activeJobs:stats.inQueue')} />
        <StatCard label={t('activeJobs:stats.inProgress')} value={inProgress} sub={t('activeJobs:stats.beingWorked')} />
        <StatCard label={t('activeJobs:stats.onHold')}     value={onHold}     sub={t('activeJobs:stats.waiting')} />
        <StatCard label={t('activeJobs:stats.completed')}  value={completed}  sub={t('activeJobs:stats.finished')} />
      </section>

      <section className="production-layout">
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>{t('activeJobs:list.title')}</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder={t('activeJobs:list.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>{t('common:filter.status')}</label>
                      <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">{t('activeJobs:filter.all')}</option>
                        <option value="in_progress">{t('activeJobs:filter.inProgress')}</option>
                        <option value="on_hold">{t('activeJobs:filter.onHold')}</option>
                        <option value="completed">{t('activeJobs:filter.completed')}</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>{t('common:filter.apply')}</button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>{t('activeJobs:noMatch')}</p>
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
                  <p style={{ marginBottom: 2 }}><strong>{t('activeJobs:list.client')}:</strong> {j.client}</p>
                  <p style={{ marginBottom: 2 }}><strong>{t('activeJobs:list.product')}:</strong> {j.product} — {j.qty} {t('activeJobs:detail.pcs')}</p>
                  <p style={{ marginBottom: 6 }}><strong>{t('activeJobs:list.due')}:</strong> {j.dueDate}</p>
                  <ProgressBar percent={pct(j)} color={progressColor(pct(j))} />
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                    {j.progress} / {j.qty} {t('activeJobs:list.printed')} ({pct(j)}%)
                  </p>
                  <div className="card-actions">
                    <button className="btn" onClick={(e) => { e.stopPropagation(); setSelectedJob(j); setShowWorkView(true); }}>
                      {t('activeJobs:list.openWorkView')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        {selectedJob && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selectedJob.id}</h3>
              <StatusBadge status={selectedJob.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selectedJob.client}</p>
            <div className="line" />
            <h4 style={{ margin: '12px 0 8px' }}>{t('activeJobs:detail.title')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('activeJobs:detail.product')}:</strong> {selectedJob.product}</li>
              <li><strong>{t('activeJobs:detail.quantity')}:</strong> {selectedJob.qty} {t('activeJobs:detail.pcs')}</li>
              <li><strong>{t('activeJobs:detail.paper')}:</strong> {selectedJob.paper}</li>
              <li><strong>{t('activeJobs:detail.dueDate')}:</strong> {selectedJob.dueDate}</li>
            </ul>
            <div className="line" />
            <h4 style={{ margin: '12px 0 8px' }}>{t('activeJobs:detail.progress')}</h4>
            <ProgressBar percent={pct(selectedJob)} color={progressColor(pct(selectedJob))} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selectedJob.progress} / {selectedJob.qty} ({pct(selectedJob)}%) {t('activeJobs:detail.complete')}
            </p>
            <div className="line" />
            <h4 style={{ margin: '12px 0 8px' }}>{t('activeJobs:detail.steps')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
              {STEP_KEYS.map((key, i) => {
                const done    = i < step;
                const current = i === step;
                return (
                  <li key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: done ? '#2c9a4b' : current ? '#2f3640' : '#e4e6eb',
                      color: done || current ? '#fff' : 'var(--muted)',
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ fontWeight: current ? 600 : 400, color: done ? '#2c9a4b' : current ? 'var(--text)' : 'var(--muted)' }}>
                      {t(`activeJobs:steps.${key}`)}
                      {current && <span style={{ fontSize: 11, marginLeft: 6, color: '#e89023' }}>{t('activeJobs:detail.current')}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="line" />
            <button className="btn primary block" style={{ marginTop: 4 }} onClick={() => setShowWorkView(true)}>
              {t('activeJobs:detail.openWorkView')}
            </button>
          </aside>
        )}
      </section>

      {showWorkView && selectedJob && (() => {
        const p = pct(selectedJob);
        const s = currentStep(p);
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowWorkView(false); }}
          >
            <div style={{ background: 'var(--surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 680, boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border, #e4e6eb)', position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 1 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t('activeJobs:workView.title', { id: selectedJob.id })}</h2>
                <button onClick={() => setShowWorkView(false)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {t('activeJobs:workView.close')}
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selectedJob.client} · {selectedJob.product}</p>
                <ProgressBar percent={p} color={p === 100 ? 'green' : p >= 50 ? 'orange' : undefined} />
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 18 }}>
                  {selectedJob.progress} / {selectedJob.qty} {t('activeJobs:workView.printed')} ({p}%)
                </p>

                {selectedJob.stages && selectedJob.stages.length > 0 ? (
                  <>
                    <h4 style={{ marginBottom: 10 }}>{t('activeJobs:workView.stages')}</h4>
                    <table style={{ marginBottom: 20 }}>
                      <thead>
                        <tr>
                          <th>{t('activeJobs:workView.table.stage')}</th>
                          <th>{t('activeJobs:workView.table.status')}</th>
                          <th>{t('activeJobs:workView.table.updatedAt')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJob.stages.map((st) => (
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
                    <h4 style={{ marginBottom: 10 }}>{t('activeJobs:workView.stepsTitle')}</h4>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginBottom: 20 }}>
                      {STEP_KEYS.map((key, i) => {
                        const done    = i < s;
                        const current = i === s;
                        return (
                          <li key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
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
                              {t(`activeJobs:steps.${key}`)}
                              {current && <span style={{ fontSize: 11, marginLeft: 6, color: '#e89023' }}>{t('activeJobs:detail.current')}</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                  <p><strong>{t('activeJobs:workView.client')}:</strong> {selectedJob.client}</p>
                  <p><strong>{t('activeJobs:workView.batch')}:</strong> {selectedJob.batchCode}</p>
                  <p><strong>{t('activeJobs:workView.product')}:</strong> {selectedJob.product}</p>
                  <p><strong>{t('activeJobs:workView.quantity')}:</strong> {selectedJob.qty} {t('activeJobs:workView.pcs')}</p>
                  <p><strong>{t('activeJobs:workView.paper')}:</strong> {selectedJob.paper}</p>
                  <p><strong>{t('activeJobs:workView.dueDate')}:</strong> {selectedJob.dueDate}</p>
                  {selectedJob.priority   && <p><strong>{t('activeJobs:workView.priority')}:</strong> {selectedJob.priority}</p>}
                  {selectedJob.assignedTo && <p><strong>{t('activeJobs:workView.assignedTo')}:</strong> {selectedJob.assignedTo}</p>}
                  {selectedJob.notes      && <p style={{ gridColumn: '1 / -1' }}><strong>{t('activeJobs:workView.notes')}:</strong> {selectedJob.notes}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

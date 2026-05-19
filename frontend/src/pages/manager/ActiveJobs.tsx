import { useState, useEffect, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders, getProductionJobs } from '../../lib/api/ordersQuotesService';

// ─── Types ──────────────────────────────────────────────────────────
interface ProductionJob {
  id: number;
  job_id: string;
  order_id: number;
  client_name: string;
  product: string;
  quantity: number;
  completed_quantity: number;
  status: string;                     // e.g. 'in_progress', 'completed', etc.
  current_step: number;               // 1‑based step index
  due_date: string | null;
  specs: Record<string, any>;
  files: any[];
}

// ─── Simple utility functions (replacing managerProductionUtils) ─────
function statusLabel(status: string): string {
  switch (status) {
    case 'in_progress': return 'In Progress';
    case 'completed':  return 'Completed';
    case 'ready':      return 'Ready';
    case 'on_hold':    return 'On Hold';
    default:           return status;
  }
}

const STEP_KEYS = [
  'File Approved',
  'Printing Started',
  'Finishing',
  'Quality Check',
  'Ready for Delivery',
] as const;

function stepLabel(stepIndex: number | undefined | null): string {
  if (stepIndex == null || stepIndex < 1 || stepIndex > STEP_KEYS.length)
    return 'Unknown';
  return STEP_KEYS[stepIndex - 1];
}

function progressPercent(job: { quantity: number; completed_quantity: number }): number {
  const qty = job.quantity || 1;
  const done = job.completed_quantity || 0;
  return Math.min(100, Math.round((done / qty) * 100));
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────────────
export default function ActiveJobs() {
  return (
    <Suspense fallback={null}>
      <ActiveJobsInner />
    </Suspense>
  );
}

function ActiveJobsInner() {
  const { t, i18n } = useTranslation(['common', 'activeJobs']);
  const { navigateTopLevel } = useNavigation();

  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [jobsRes, completedRes] = await Promise.all([
          getProductionJobs(),
          getOrders({ status: 'COMPLETED' }),
        ]);
        const nextJobs = jobsRes.data.data as ProductionJob[];
        setJobs(nextJobs);
        setCompletedOrders(completedRes.data.data.length);
        setSelectedJob(nextJobs[0] || null);
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
    load();
  }, []);

  // ── Computed stats ─────────────────────────────────────────────────
  const activeJobs   = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').length;
  const inProgress   = jobs.filter((j) => j.status === 'in_progress').length;
  const readyItems   = jobs.filter((j) => j.status === 'completed' || j.status === 'ready').length;

  // ── Filtering ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesText =
        !q ||
        job.job_id.toLowerCase().includes(q) ||
        String(job.order_id).includes(q) ||
        job.client_name.toLowerCase().includes(q) ||
        job.product.toLowerCase().includes(q);
      const matchesStatus = !filterStatus || job.status === filterStatus;
      return matchesText && matchesStatus;
    });
  }, [jobs, query, filterStatus]);

  const lang = i18n.language;

  // ── Loading / Error states ─────────────────────────────────────────
  if (loading) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title={t('activeJobs:title')} />
        <div className="loading-state">{t('activeJobs:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="manager" activePage="active-jobs">
        <Topbar title={t('activeJobs:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <AppShell role="manager" activePage="active-jobs">
      <Topbar title={t('activeJobs:title')} />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('activeJobs:stats.activeJobs')}   value={activeJobs}      sub={t('activeJobs:stats.inQueue')} />
        <StatCard label={t('activeJobs:stats.inProgress')}   value={inProgress}      sub={t('activeJobs:stats.beingWorked')} />
        <StatCard label={t('activeJobs:stats.readyItems')}    value={readyItems}      sub={t('activeJobs:stats.readySub')} />
        <StatCard label={t('activeJobs:stats.completedOrders')} value={completedOrders} sub={t('activeJobs:stats.completedSub')} />
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
                <select
                  className="select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ maxWidth: 180 }}
                >
                  <option value="">{t('activeJobs:filter.all')}</option>
                  <option value="in_progress">{t('activeJobs:filter.inProgress')}</option>
                  <option value="ready">{t('activeJobs:filter.ready')}</option>
                  <option value="completed">{t('activeJobs:filter.completed')}</option>
                </select>
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>
                  {t('activeJobs:noMatch')}
                </p>
              ) : (
                filtered.map((job) => {
                  const percent = progressPercent(job);
                  return (
                    <article
                      key={job.id}
                      className={`card${selectedJob?.id === job.id ? ' card--selected' : ''}`}
                      onClick={() => setSelectedJob(job)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <h4>{job.job_id}</h4>
                        <StatusBadge status={statusLabel(job.status)} />
                      </div>
                      <p><strong>{t('activeJobs:list.order')}:</strong> #{job.order_id}</p>
                      <p><strong>{t('activeJobs:list.client')}:</strong> {job.client_name}</p>
                      <p>
                        <strong>{t('activeJobs:list.product')}:</strong> {job.product} — {job.quantity} {t('activeJobs:detail.pcs')}
                      </p>
                      <p><strong>{t('activeJobs:list.step')}:</strong> {stepLabel(job.current_step)}</p>
                      <p><strong>{t('activeJobs:list.due')}:</strong> {formatDate(job.due_date, lang)}</p>
                      <ProgressBar percent={percent} color={percent === 100 ? 'green' : percent >= 50 ? 'orange' : undefined} />
                      <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                        {job.completed_quantity} / {job.quantity} {t('activeJobs:list.complete')} ({percent}%)
                      </p>
                      <div className="card-actions">
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setShowWorkView(true);
                          }}
                        >
                          {t('activeJobs:list.openWorkView')}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>
        </div>

        {selectedJob && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ fontSize: 17 }}>{selectedJob.job_id}</h3>
              <StatusBadge status={statusLabel(selectedJob.status)} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              {t('activeJobs:detail.orderAndClient', { orderId: selectedJob.order_id, client: selectedJob.client_name })}
            </p>
            <div className="line" />
            <h4 style={{ margin: '12px 0 8px' }}>{t('activeJobs:detail.title')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('activeJobs:detail.product')}:</strong> {selectedJob.product}</li>
              <li><strong>{t('activeJobs:detail.quantity')}:</strong> {selectedJob.quantity} {t('activeJobs:detail.pcs')}</li>
              <li><strong>{t('activeJobs:detail.step')}:</strong> {stepLabel(selectedJob.current_step)}</li>
              <li><strong>{t('activeJobs:detail.dueDate')}:</strong> {formatDate(selectedJob.due_date, lang)}</li>
            </ul>
            <div className="line" />
            <h4 style={{ margin: '12px 0 8px' }}>{t('activeJobs:detail.progress')}</h4>
            <ProgressBar percent={progressPercent(selectedJob)} color={progressPercent(selectedJob) === 100 ? 'green' : 'orange'} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selectedJob.completed_quantity} / {selectedJob.quantity} {t('activeJobs:detail.complete')}
            </p>
            <div className="line" />
            <button
              className="btn primary block"
              style={{ marginTop: 14 }}
              onClick={() => setShowWorkView(true)}
            >
              {t('activeJobs:detail.openWorkView')}
            </button>
          </aside>
        )}
      </section>

      {/* ── Work View Modal (kept from your original) ── */}
      {showWorkView && selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '32px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWorkView(false);
          }}
        >
          <div
            style={{
              background: 'var(--surface, #fff)',
              borderRadius: 12,
              width: '100%',
              maxWidth: 680,
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border, #e4e6eb)',
                position: 'sticky',
                top: 0,
                background: 'var(--surface, #fff)',
                zIndex: 1,
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {t('activeJobs:workView.title', { id: selectedJob.job_id })}
              </h2>
              <button
                onClick={() => setShowWorkView(false)}
                style={{
                  padding: '5px 14px',
                  background: '#2f3640',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {t('activeJobs:workView.close')}
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                {selectedJob.client_name} · {selectedJob.product}
              </p>

              <ProgressBar
                percent={progressPercent(selectedJob)}
                color={progressPercent(selectedJob) === 100 ? 'green' : 'orange'}
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 18 }}>
                {selectedJob.completed_quantity} / {selectedJob.quantity} {t('activeJobs:workView.printed')} ({progressPercent(selectedJob)}%)
              </p>

              {/* Show steps from static list, highlighting current step */}
              <h4 style={{ marginBottom: 10 }}>{t('activeJobs:workView.stepsTitle')}</h4>
              <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginBottom: 20 }}>
                {STEP_KEYS.map((key, i) => {
                  const stepIdx = i + 1;
                  const currentStep = selectedJob.current_step;
                  const done = stepIdx < currentStep;
                  const current = stepIdx === currentStep;
                  return (
                    <li key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          background: done ? '#2c9a4b' : current ? '#2f3640' : '#e4e6eb',
                          color: done || current ? '#fff' : 'var(--muted)',
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span
                        style={{
                          fontWeight: current ? 600 : 400,
                          color: done ? '#2c9a4b' : current ? 'var(--text)' : 'var(--muted)',
                        }}
                      >
                        {t(`activeJobs:steps.${key}`)}
                        {current && (
                          <span style={{ fontSize: 11, marginLeft: 6, color: '#e89023' }}>
                            {t('activeJobs:detail.current')}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                <p><strong>{t('activeJobs:workView.client')}:</strong> {selectedJob.client_name}</p>
                <p><strong>{t('activeJobs:workView.order')}:</strong> #{selectedJob.order_id}</p>
                <p><strong>{t('activeJobs:workView.product')}:</strong> {selectedJob.product}</p>
                <p><strong>{t('activeJobs:workView.quantity')}:</strong> {selectedJob.quantity} {t('activeJobs:workView.pcs')}</p>
                <p><strong>{t('activeJobs:workView.step')}:</strong> {stepLabel(selectedJob.current_step)}</p>
                <p><strong>{t('activeJobs:workView.dueDate')}:</strong> {formatDate(selectedJob.due_date, lang)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
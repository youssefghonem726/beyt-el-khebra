import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { getProductionJobs, updateProductionJob } from '../../lib/api/ordersQuotesService';

interface Stage {
  stage: string;
  status: string;
}

interface Job {
  id: string;
  itemId: number;
  orderId: number;
  orderStatus: string;
  client: string;
  product: string;
  qty: number;
  completedQty: number;
  status: string;
  currentStep: string;
  dueDate: string;
  notes: string;
  stages: Stage[];
}

const STEP_ORDER = ['pending', 'design', 'printing', 'cutting', 'packaging', 'ready'];

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getProgress(job: Job): number {
  if (job.qty <= 0) return 0;
  return Math.round((job.completedQty / job.qty) * 100);
}

function progressColor(progress: number): 'green' | 'orange' | undefined {
  if (progress === 100) return 'green';
  if (progress >= 50) return 'orange';
  return undefined;
}

function buildStages(currentStep: string, status: string): Stage[] {
  const currentIndex = Math.max(STEP_ORDER.indexOf(currentStep), 0);
  return STEP_ORDER.map((step, index) => ({
    stage: step,
    status: index < currentIndex ? 'completed' : index === currentIndex ? status : 'pending',
  }));
}

function mapJob(job: any): Job {
  const currentStep = job.current_step || 'pending';
  const completedQty = Number(job.completed_quantity || 0);
  const qty = Number(job.quantity || 0);

  return {
    id: String(job.job_id || `JOB-${job.id}`),
    itemId: Number(job.id),
    orderId: Number(job.order_id),
    orderStatus: job.order_status || 'CONFIRMED',
    client: job.client_name || 'Unknown',
    product: job.product || 'Order Item',
    qty,
    completedQty,
    status: job.status || 'ready_for_production',
    currentStep,
    dueDate: formatDate(job.due_date),
    notes: job.notes || '-',
    stages: buildStages(currentStep, job.status || 'ready_for_production'),
  };
}

export default function Production() {
  return (
    <Suspense fallback={null}>
      <ProductionInner />
    </Suspense>
  );
}

function ProductionInner() {
  const { t } = useTranslation(['common', 'production']);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProductionJobs();
      const jobList = (response.data.data || []).map(mapJob);
      setJobs(jobList);
      setSelectedJob((current) => {
        if (!jobList.length) return null;
        if (!current) return jobList[0];
        return jobList.find((job) => job.itemId === current.itemId) || jobList[0];
      });
    } catch (err) {
      console.error('Failed to load production data:', err);
      setError(t('production:error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStepUpdate = async (job: Job, currentStep: string) => {
    setSavingJobId(job.itemId);
    try {
      await updateProductionJob(job.itemId, { current_step: currentStep });
      await fetchData();
    } catch (err) {
      console.error('Failed to update production job:', err);
      setError(t('production:updateError'));
    } finally {
      setSavingJobId(null);
    }
  };

  const activeJobs = jobs.filter((job) => job.status !== 'completed').length;
  const inProgress = jobs.filter((job) => job.status === 'in_progress').length;
  const ready = jobs.filter((job) => job.status === 'ready_for_production').length;
  const completed = jobs.filter((job) => job.status === 'completed').length;

  const filtered = jobs.filter((job) => {
    const q = query.toLowerCase();
    const matchesQuery = !q
      || job.id.toLowerCase().includes(q)
      || String(job.orderId).includes(q)
      || job.client.toLowerCase().includes(q)
      || job.product.toLowerCase().includes(q);
    const matchesStatus = !filterStatus || job.status === filterStatus || job.currentStep === filterStatus;
    return matchesQuery && matchesStatus;
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-production">
        <Topbar title={t('production:title')} />
        <div className="loading-state">{t('production:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-production">
      <Topbar title={t('production:title')} />

      {error && <div className="error-state" style={{ marginBottom: 12 }}>{error}</div>}

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('production:stats.activeJobs')} value={activeJobs} sub={t('production:stats.activeSub')} />
        <StatCard label={t('production:stats.ready')} value={ready} sub={t('production:stats.readySub')} />
        <StatCard label={t('production:stats.inProgress')} value={inProgress} sub={t('production:stats.inProgressSub')} />
        <StatCard label={t('production:stats.completed')} value={completed} sub={t('production:stats.completedSub')} />
      </section>

      <section className="production-layout">
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>{t('production:table.title')}</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder={t('production:table.searchPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen((open) => !open)}>v</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>{t('production:table.filter.label')}</label>
                      <select className="select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                        <option value="">{t('production:table.filter.all')}</option>
                        <option value="ready_for_production">{t('production:steps.pending')}</option>
                        <option value="design">{t('production:steps.design')}</option>
                        <option value="printing">{t('production:steps.printing')}</option>
                        <option value="cutting">{t('production:steps.cutting')}</option>
                        <option value="packaging">{t('production:steps.packaging')}</option>
                        <option value="completed">{t('production:steps.ready')}</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>{t('production:table.filter.apply')}</button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>{t('production:table.empty')}</p>
              ) : filtered.map((job) => {
                const progress = getProgress(job);
                return (
                  <article
                    key={job.id}
                    className={`card${selectedJob?.itemId === job.itemId ? ' card--selected' : ''}`}
                    onClick={() => setSelectedJob(job)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h4>{job.id}</h4>
                      <StatusBadge status={job.status} />
                    </div>
                    <p style={{ marginBottom: 2 }}><strong>{t('production:card.order')}:</strong> #{job.orderId}</p>
                    <p style={{ marginBottom: 2 }}><strong>{t('production:card.client')}:</strong> {job.client}</p>
                    <p style={{ marginBottom: 2 }}>
                      <strong>{t('production:card.product')}:</strong> {job.product} - {t('production:card.pcs', { count: job.qty })}
                    </p>
                    <p style={{ marginBottom: 6 }}>
                      <strong>{t('production:card.step')}:</strong> {t(`production:steps.${job.currentStep}`)}
                    </p>
                    <ProgressBar percent={progress} color={progressColor(progress)} />
                    <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                      {t('production:card.completedOf', { completed: job.completedQty, total: job.qty, percent: progress })}
                    </p>
                    <div className="card-actions">
                      <button
                        className="btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedJob(job);
                          setShowWorkView(true);
                        }}
                      >
                        {t('production:card.openWorkView')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </div>

        {selectedJob && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selectedJob.id}</h3>
              <StatusBadge status={selectedJob.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Order #{selectedJob.orderId} - {selectedJob.client}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('production:detail.jobDetails')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('production:detail.product')}:</strong> {selectedJob.product}</li>
              <li><strong>{t('production:detail.quantity')}:</strong> {t('production:card.pcs', { count: selectedJob.qty })}</li>
              <li><strong>{t('production:detail.orderStatus')}:</strong> {selectedJob.orderStatus}</li>
              <li><strong>{t('production:detail.dueDate')}:</strong> {selectedJob.dueDate}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('production:detail.progress')}</h4>
            <ProgressBar percent={getProgress(selectedJob)} color={progressColor(getProgress(selectedJob))} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {t('production:detail.completedOf', { completed: selectedJob.completedQty, total: selectedJob.qty, percent: getProgress(selectedJob) })}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('production:detail.updateStep')}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STEP_ORDER.slice(1).map((step) => (
                <button
                  key={step}
                  className={step === 'ready' ? 'btn primary' : 'btn'}
                  disabled={savingJobId === selectedJob.itemId}
                  onClick={() => handleStepUpdate(selectedJob, step)}
                >
                  {t(`production:steps.${step}`)}
                </button>
              ))}
            </div>

            <div className="line" />

            <button className="btn primary block" style={{ marginTop: 4 }} onClick={() => setShowWorkView(true)}>
              {t('production:detail.openWorkView')}
            </button>
          </aside>
        )}
      </section>

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
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowWorkView(false);
          }}
        >
          <div style={{
            background: 'var(--surface, #fff)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border, #e4e6eb)',
              position: 'sticky',
              top: 0,
              background: 'var(--surface, #fff)',
              zIndex: 1,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {t('production:workView.title', { id: selectedJob.id })}
              </h2>
              <button className="btn" onClick={() => setShowWorkView(false)}>{t('production:workView.close')}</button>
            </div>
            <div style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 8 }}>{t('production:workView.progressTitle', { id: selectedJob.id })}</h3>
              <ProgressBar percent={getProgress(selectedJob)} color={progressColor(getProgress(selectedJob))} />
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 16 }}>
                {t('production:workView.completedOf', { completed: selectedJob.completedQty, total: selectedJob.qty, percent: getProgress(selectedJob) })}
              </p>
              <table className="orders-table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>{t('production:workView.stageCol')}</th>
                    <th>{t('production:workView.statusCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJob.stages.map((stage) => (
                    <tr key={stage.stage}>
                      <td>{t(`production:steps.${stage.stage}`)}</td>
                      <td><StatusBadge status={stage.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 style={{ marginBottom: 12 }}>{t('production:workView.jobInfo')}</h3>
              <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                <p><strong>{t('production:workView.client')}:</strong> {selectedJob.client}</p>
                <p><strong>{t('production:workView.order')}:</strong> #{selectedJob.orderId}</p>
                <p><strong>{t('production:workView.product')}:</strong> {selectedJob.product}</p>
                <p><strong>{t('production:workView.quantity')}:</strong> {selectedJob.qty}</p>
                <p><strong>{t('production:workView.status')}:</strong> <StatusBadge status={selectedJob.status} /></p>
                <p><strong>{t('production:workView.currentStep')}:</strong> {t(`production:steps.${selectedJob.currentStep}`)}</p>
                <p><strong>{t('production:workView.deadline')}:</strong> {selectedJob.dueDate}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>{t('production:workView.notes')}:</strong> {selectedJob.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

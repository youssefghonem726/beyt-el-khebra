import { useEffect, useMemo, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import {
  getProductionJobs,
  updateProductionJob,
} from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import {
  PRODUCTION_STEPS,
  fileName,
  fileUrl,
  progressPercent,
  specSummary,
  statusLabel,
  stepLabel,
  type ProductionJob,
  type ProductionStep,
} from './managerProductionUtils';

interface Props {
  role?: 'manager' | 'owner';
}

// ─── Locale‑aware formatting (overrides the imported `formatDate` if needed) ────
function formatDate(value?: string | null, lang: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface StageView {
  stage: string;
  status: string;
  updated: string;
}

// Helper to enrich production jobs with batch stages (if available)
async function enrichJobsWithStages(jobs: ProductionJob[]): Promise<ProductionJob[]> {
  try {
    const res = await getBatches();
    const batches: any[] = res.data.data || [];
    const batchMap = new Map<number, any[]>();
    batches.forEach(b => {
      const orderId = b.orderId || b.order_id;
      if (!batchMap.has(orderId)) batchMap.set(orderId, []);
      batchMap.get(orderId)!.push(b);
    });

    return jobs.map(job => {
      const relatedBatches = batchMap.get(job.order_id) || [];
      // Combine all stages from all related batches
      const allStages: StageView[] = [];
      relatedBatches.forEach(batch => {
        (batch.stages || []).forEach((s: any) => {
          allStages.push({
            stage: s.stage,
            status: s.status,
            updated: s.updatedAt ? formatDate(s.updatedAt, 'en') : '—',
          });
        });
      });
      return { ...job, _stages: allStages };
    });
  } catch {
    return jobs;
  }
}

export default function OrderWorkView({ role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <OrderWorkViewInner role={role} />
    </Suspense>
  );
}

function OrderWorkViewInner({ role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'orderWorkView']);
  const location = useLocation();
  const selectedJobId = new URLSearchParams(location.search).get('job');
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    const response = await getProductionJobs();
    let prodJobs = response.data.data as ProductionJob[];
    prodJobs = await enrichJobsWithStages(prodJobs);
    setJobs(prodJobs);
  };

  useEffect(() => {
    loadJobs()
      .catch((err) => {
        console.error('Failed to load work view:', err);
        setError(t('orderWorkView:error'));
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleJobs = useMemo(() => {
    if (!selectedJobId) return jobs;
    return jobs.filter(
      (job) =>
        String(job.id) === selectedJobId || job.job_id === selectedJobId
    );
  }, [jobs, selectedJobId]);

  const handleStepUpdate = async (
    job: ProductionJob,
    current_step: ProductionStep
  ) => {
    setSavingId(job.id);
    setError(null);
    try {
      await updateProductionJob(job.id, { current_step });
      await loadJobs();
    } catch (err) {
      console.error('Failed to update production step:', err);
      setError(t('orderWorkView:stepUpdateError'));
    } finally {
      setSavingId(null);
    }
  };

  const lang = i18n.language;

  if (loading) {
    return (
      <AppShell
        role={role}
        activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}
      >
        <Topbar title={t('orderWorkView:title')} />
        <div className="loading-state">{t('orderWorkView:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      role={role}
      activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}
    >
      <Topbar
        title={
          selectedJobId
            ? t('orderWorkView:titleSingle', { id: selectedJobId })
            : t('orderWorkView:title')
        }
      />

      {error && (
        <div
          className="box"
          style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      {visibleJobs.length === 0 ? (
        <section className="box">
          <p className="muted">{t('orderWorkView:noJobs')}</p>
        </section>
      ) : (
        visibleJobs.map((job) => {
          const percent = progressPercent(job);
          const stages = (job as any)._stages as StageView[] | undefined;
          return (
            <section key={job.id} className="split" style={{ marginBottom: 14 }}>
              <article className="box">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <h3>
                    {t('orderWorkView:progress.title', { id: job.job_id })}
                  </h3>
                  <StatusBadge status={statusLabel(job.status)} />
                </div>
                <p className="muted" style={{ marginBottom: 10 }}>
                  {t('orderWorkView:orderInfo', {
                    orderId: job.order_id,
                    client: job.client_name,
                  })}
                </p>

                <p>
                  <strong>
                    {job.completed_quantity} / {job.quantity}
                  </strong>{' '}
                  {t('orderWorkView:progress.completed')} ({percent}%)
                </p>
                <ProgressBar
                  percent={percent}
                  color={
                    percent === 100
                      ? 'green'
                      : percent >= 50
                        ? 'orange'
                        : undefined
                  }
                  style={{ margin: '8px 0 14px' }}
                />

                <h4 style={{ marginBottom: 8 }}>
                  {t('orderWorkView:updateStep')}
                </h4>
                <div
                  className="actions-inline"
                  style={{ flexWrap: 'wrap', marginBottom: 16 }}
                >
                  {PRODUCTION_STEPS.map((step) => (
                    <button
                      key={step.value}
                      className={`btn${
                        job.current_step === step.value ? ' primary' : ''
                      }`}
                      disabled={savingId === job.id}
                      onClick={() => handleStepUpdate(job, step.value)}
                    >
                      {t(`orderWorkView:steps.${step.label}`)}
                    </button>
                  ))}
                </div>

                {stages && stages.length > 0 && (
                  <>
                    <h4 style={{ marginBottom: 8 }}>
                      {t('orderWorkView:stages')}
                    </h4>
                    <table
                      className="orders-table"
                      style={{ width: '100%', marginBottom: 14 }}
                    >
                      <thead>
                        <tr>
                          <th>{t('orderWorkView:table.stage')}</th>
                          <th>{t('orderWorkView:table.status')}</th>
                          <th>{t('orderWorkView:table.updatedAt')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stages.map((s, idx) => (
                          <tr key={`${s.stage}-${idx}`}>
                            <td>{s.stage}</td>
                            <td>
                              <StatusBadge status={s.status} />
                            </td>
                            <td>{s.updated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <h4 style={{ marginBottom: 8 }}>
                  {t('orderWorkView:specifications')}
                </h4>
                <table className="orders-table" style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <th>{t('orderWorkView:detail.product')}</th>
                      <td>{job.product}</td>
                    </tr>
                    <tr>
                      <th>{t('orderWorkView:detail.quantity')}</th>
                      <td>{job.quantity} {t('orderWorkView:detail.pcs')}</td>
                    </tr>
                    <tr>
                      <th>{t('orderWorkView:detail.currentStep')}</th>
                      <td>{stepLabel(job.current_step)}</td>
                    </tr>
                    <tr>
                      <th>{t('orderWorkView:detail.dueDate')}</th>
                      <td>{formatDate(job.due_date, lang)}</td>
                    </tr>
                    <tr>
                      <th>{t('orderWorkView:detail.specs')}</th>
                      <td>{specSummary(job.specs)}</td>
                    </tr>
                    <tr>
                      <th>{t('orderWorkView:detail.notes')}</th>
                      <td>{job.notes || t('orderWorkView:detail.notProvided')}</td>
                    </tr>
                  </tbody>
                </table>
              </article>

              <aside className="box">
                <h3>{t('orderWorkView:info.title')}</h3>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    display: 'grid',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <li>
                    <strong>{t('orderWorkView:info.client')}:</strong>{' '}
                    {job.client_name}
                  </li>
                  <li>
                    <strong>{t('orderWorkView:info.email')}:</strong>{' '}
                    {job.client_email || t('orderWorkView:info.notProvided')}
                  </li>
                  <li>
                    <strong>{t('orderWorkView:info.order')}:</strong>{' '}
                    #{job.order_id}
                  </li>
                  <li>
                    <strong>{t('orderWorkView:info.batchCode')}:</strong>{' '}
                    {(job as any).batch_code ||
                      t('orderWorkView:info.notAssigned')}
                  </li>
                  <li>
                    <strong>{t('orderWorkView:info.orderStatus')}:</strong>{' '}
                    {job.order_status}
                  </li>
                  <li>
                    <strong>{t('orderWorkView:info.productionStatus')}:</strong>{' '}
                    {statusLabel(job.status)}
                  </li>
                </ul>

                <div className="line" />
                <h3 style={{ marginBottom: 10 }}>
                  {t('orderWorkView:files.title')}
                </h3>
                {!job.files?.length ? (
                  <p className="muted">{t('orderWorkView:files.empty')}</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {job.files.map((file) => {
                      const url = fileUrl(file);
                      return (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            alignItems: 'center',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '8px 10px',
                          }}
                        >
                          <span style={{ fontSize: 13 }}>
                            {fileName(file)}
                          </span>
                          {url ? (
                            <a
                              className="btn"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t('orderWorkView:files.open')}
                            </a>
                          ) : (
                            <span className="muted">
                              {t('orderWorkView:files.noUrl')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </aside>
            </section>
          );
        })
      )}
    </AppShell>
  );
}
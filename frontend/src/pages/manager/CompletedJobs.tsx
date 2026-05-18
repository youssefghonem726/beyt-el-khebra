import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

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

function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CompletedJobs({ role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <CompletedJobsInner role={role} />
    </Suspense>
  );
}

function CompletedJobsInner({ role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'completedJobs']);
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

        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c]));

        const completedBatches = batchesRaw.filter((b) => b.status === 'completed');

        const jobList: Job[] = completedBatches.map((batch) => {
          const order = orderMap.get(batch.orderId);
          const client = order ? clientMap.get(order.customer) : null;
          const completion = batch.deadline
            ? formatDate(batch.deadline, i18n.language)
            : order?.created_at ? formatDate(order.created_at, i18n.language) : '—';

          const stages: Stage[] = (batch.stages || []).map((s) => ({
            stage: s.stage,
            status: s.status,
            updated: s.updatedAt ? formatDateTime(s.updatedAt, i18n.language) : '—',
          }));

          return {
            id: String(batch.id),
            done: batch.progress,
            total: batch.qty,
            stages,
            info: {
              client: client ? client.name : 'Unknown',
              batch: String(batch.id),
              product: batch.product,
              qty: batch.qty,
              status: 'completed',
              priority: batch.priority,
              deadline: batch.deadline ? formatDate(batch.deadline, i18n.language) : '—',
              team: batch.assignedTo || 'Unassigned',
              completion,
              notes: batch.notes || '—',
            },
          };
        });

        setJobs(jobList);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setJobs([]);
        } else {
          console.error('Failed to load completed jobs:', err);
          setError(t('completedJobs:error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activePage = role === 'owner' ? 'owner-dashboard' : 'completed-jobs';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('completedJobs:title')} />
        <div className="loading-state">{t('completedJobs:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('completedJobs:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={t('completedJobs:title')} />
      {jobs.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>{t('completedJobs:empty')}</p>
      )}
      {jobs.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>{t('completedJobs:progress.title', { id: j.id })}</h3>
            <p><strong>{j.done} / {j.total}</strong> {t('completedJobs:progress.completed')} (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
            <table className="orders-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{t('completedJobs:progress.table.stage')}</th>
                  <th>{t('completedJobs:progress.table.status')}</th>
                  <th>{t('completedJobs:progress.table.updatedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {j.stages.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>{t('completedJobs:progress.table.noStages')}</td></tr>
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
            <h3>{t('completedJobs:info.title')}</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li><strong>{t('completedJobs:info.client')}:</strong> {j.info.client}</li>
              <li><strong>{t('completedJobs:info.batch')}:</strong> {j.info.batch}</li>
              <li><strong>{t('completedJobs:info.product')}:</strong> {j.info.product}</li>
              <li><strong>{t('completedJobs:info.quantity')}:</strong> {j.info.qty}</li>
              <li><strong>{t('completedJobs:info.status')}:</strong> {j.info.status}</li>
              <li><strong>{t('completedJobs:info.priority')}:</strong> {j.info.priority}</li>
              <li><strong>{t('completedJobs:info.deadline')}:</strong> {j.info.deadline}</li>
              <li><strong>{t('completedJobs:info.assignedTo')}:</strong> {j.info.team}</li>
              <li><strong>{t('completedJobs:info.completionDate')}:</strong> {j.info.completion}</li>
              <li><strong>{t('completedJobs:info.notes')}:</strong> {j.info.notes}</li>
            </ul>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}

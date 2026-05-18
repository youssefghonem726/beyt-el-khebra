import { useEffect, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import { getUploads } from '../../lib/api/uploadsService';
import type { UploadFile } from '../../lib/api/uploadsService';

interface StageDisplay {
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

interface JobDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
  downloadUrl?: string;
}

interface Job {
  id: string;
  done: number;
  total: number;
  percent: number;
  stages: StageDisplay[];
  info: JobInfo;
  documents: JobDocument[];
}

interface Props {
  jobId?: string;
  role?: 'manager' | 'owner';
}

function formatDateTime(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

const TYPE_COLORS: Record<string, string> = {
  PDF: '#e53e3e', AI: '#f97316', PSD: '#2563eb',
  PNG: '#059669', JPG: '#059669', SVG: '#aa3bff', Other: '#6b7280',
};

function downloadDoc(doc: JobDocument) {
  if (doc.downloadUrl) {
    const a = document.createElement('a');
    a.href = doc.downloadUrl;
    a.download = doc.fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    return;
  }
  const text = [`Name: ${doc.name}`, `File: ${doc.fileName}`, `Type: ${doc.type}`, `Size: ${formatSize(doc.sizeKB)}`, `Uploaded: ${doc.uploadedDate}`, `Reorder Count: ${doc.reorderCount}`].join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = doc.fileName; a.click();
  URL.revokeObjectURL(url);
}

function JobDocuments({ docs, t }: { docs: JobDocument[]; t: (key: string) => string }) {
  if (docs.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{t('orderWorkView:documents.empty')}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {docs.map((doc) => {
        const chipColor = TYPE_COLORS[doc.type] ?? TYPE_COLORS.Other;
        return (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.fileName} · {formatSize(doc.sizeKB)}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: chipColor + '18', color: chipColor }}>{doc.type}</span>
            <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => downloadDoc(doc)}>
              {t('orderWorkView:documents.download')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderWorkView({ jobId, role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <OrderWorkViewInner jobId={jobId} role={role} />
    </Suspense>
  );
}

function OrderWorkViewInner({ jobId, role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'orderWorkView']);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesRes, ordersRes, clientsRes, uploadsRes] = await Promise.all([
          getBatches(), getOrders(), getClients(), getUploads(),
        ]);

        const batches: any[] = batchesRes.data.data;
        const orders: any[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;
        const uploads: UploadFile[] = uploadsRes.data.data || [];

        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

        const uploadsByOwner = new Map<number, UploadFile[]>();
        uploads.forEach((u) => {
          if (!uploadsByOwner.has(u.uploaded_by)) uploadsByOwner.set(u.uploaded_by, []);
          uploadsByOwner.get(u.uploaded_by)!.push(u);
        });

        const jobList: Job[] = batches.map((batch: any) => {
          const order = orderMap.get(batch.orderId);
          const clientId = order?.customer;
          const clientName = clientId ? clientMap.get(clientId) || 'Unknown' : 'Unknown';
          const percent = batch.qty > 0 ? Math.round((batch.progress / batch.qty) * 100) : 0;

          const stagesDisplay: StageDisplay[] = (batch.stages || []).map((s: any) => ({
            stage: s.stage,
            status: s.status,
            updated: formatDateTime(s.updatedAt || s.updated_at, i18n.language),
          }));

          const clientUploads = clientId ? uploadsByOwner.get(clientId) || [] : [];
          const jobDocs: JobDocument[] = clientUploads.map((u) => ({
            id: String(u.id),
            name: u.file_name || u.url.split('/').pop() || 'File',
            fileName: u.url.split('/').pop() || u.file_name || 'file',
            type: u.url.split('.').pop()?.toUpperCase() || 'Other',
            sizeKB: 0,
            uploadedDate: new Date(u.created_at).toISOString().slice(0, 10),
            reorderCount: u.reorder_count ?? 0,
            downloadUrl: u.url,
          }));

          return {
            id: String(batch.id),
            done: batch.progress,
            total: batch.qty,
            percent,
            stages: stagesDisplay,
            info: {
              client: clientName,
              batch: String(batch.id),
              product: batch.product || order?.upload?.file_name || `Order #${batch.orderId}`,
              qty: batch.qty,
              status: batch.status,
              priority: batch.priority,
              deadline: formatDate(batch.deadline, i18n.language),
              team: batch.assignedTo || 'Unassigned',
              notes: batch.notes || '—',
            },
            documents: jobDocs,
          };
        });

        let filteredJobs = jobList;
        if (jobId) {
          const match = jobList.find((j) => j.id === jobId || j.id.includes(`-${jobId}-`));
          filteredJobs = match ? [match] : [];
        }

        setJobs(filteredJobs);
      } catch (err: any) {
        console.error('Failed to load work view:', err);
        setError(t('orderWorkView:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const pageTitle = jobs.length === 1
    ? t('orderWorkView:titleSingle', { id: jobs[0].id })
    : t('orderWorkView:titleAll');

  const activePage = role === 'owner' ? 'owner-production' : 'order-work-view';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('orderWorkView:title')} />
        <div className="loading-state">{t('orderWorkView:loading')}</div>
      </AppShell>
    );
  }

  if (error || (jobId && jobs.length === 0)) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('orderWorkView:title')} />
        <div className="error-state">{error || t('orderWorkView:notFound')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={pageTitle} />
      {jobs.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>{t('orderWorkView:progress.title', { id: j.id })}</h3>
            <p><strong>{j.done} / {j.total}</strong> {t('orderWorkView:progress.completed')} ({j.percent}%)</p>
            <ProgressBar percent={j.percent} style={{ margin: '8px 0 14px' }} />
            <table className="orders-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{t('orderWorkView:progress.table.stage')}</th>
                  <th>{t('orderWorkView:progress.table.status')}</th>
                  <th>{t('orderWorkView:progress.table.updatedAt')}</th>
                </tr>
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
            <h3>{t('orderWorkView:info.title')}</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, margin: '0 0 16px' }}>
              <li><strong>{t('orderWorkView:info.client')}:</strong> {j.info.client}</li>
              <li><strong>{t('orderWorkView:info.batch')}:</strong> {j.info.batch}</li>
              <li><strong>{t('orderWorkView:info.product')}:</strong> {j.info.product}</li>
              <li><strong>{t('orderWorkView:info.quantity')}:</strong> {j.info.qty}</li>
              <li><strong>{t('orderWorkView:info.status')}:</strong> {j.info.status}</li>
              <li><strong>{t('orderWorkView:info.priority')}:</strong> {j.info.priority}</li>
              <li><strong>{t('orderWorkView:info.deadline')}:</strong> {j.info.deadline}</li>
              <li><strong>{t('orderWorkView:info.assignedTo')}:</strong> {j.info.team}</li>
              <li><strong>{t('orderWorkView:info.notes')}:</strong> {j.info.notes}</li>
            </ul>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <h3 style={{ marginBottom: 10 }}>{t('orderWorkView:documents.title')}</h3>
              <JobDocuments docs={j.documents} t={t} />
            </div>
          </aside>
        </section>
      ))}
    </AppShell>
  );
}

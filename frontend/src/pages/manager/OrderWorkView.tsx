import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

// ── Types from normalized JSON ──────────────────────────────────────────

interface Batch {
  id: string;
  orderId: string;
  clientId?: string;
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
  clientId: string;
  product: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
  ownerType: 'client' | 'template' | 'order';
  ownerId: string;
  url?: string;
}


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


function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

const TYPE_COLORS: Record<string, string> = {
  PDF: '#e53e3e',
  AI: '#f97316',
  PSD: '#2563eb',
  PNG: '#059669',
  JPG: '#059669',
  SVG: '#aa3bff',
  Other: '#6b7280',
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
  // Fallback: generate a metadata text blob
  const text = [
    `Name:           ${doc.name}`,
    `File:           ${doc.fileName}`,
    `Type:           ${doc.type}`,
    `Size:           ${formatSize(doc.sizeKB)}`,
    `Uploaded:       ${doc.uploadedDate}`,
    `Reorder Count:  ${doc.reorderCount}`,
  ].join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Document list component (unchanged) ────────────────────────────────

function JobDocuments({ docs }: { docs: JobDocument[] }) {
  if (docs.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--muted, #999)', fontStyle: 'italic' }}>
        No documents attached.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {docs.map(doc => {
        const chipColor = TYPE_COLORS[doc.type] ?? TYPE_COLORS.Other;
        return (
          <div
            key={doc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {doc.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted, #999)' }}>
                {doc.fileName} · {formatSize(doc.sizeKB)}
              </div>
            </div>

            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              background: chipColor + '18', color: chipColor, flexShrink: 0,
            }}>
              {doc.type}
            </span>

            <button
              className="btn"
              style={{ padding: '3px 10px', fontSize: 11, flexShrink: 0 }}
              onClick={() => downloadDoc(doc)}
              title={`Download ${doc.fileName}`}
            >
              ↓ Download
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function OrderWorkView({ jobId, role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json()),
      fetch('/data/json/documents.json').then(res => res.json())
    ])
      .then(([batchesData, ordersData, clientsData, docsData]) => {
        const batches: Batch[] = batchesData;
        const orders: Order[] = ordersData;
        const clients: Client[] = clientsData;
        const documents: Document[] = docsData;

        const ordersMap: Record<string, Order> = {};
        orders.forEach(o => { ordersMap[o.id] = o; });
        const clientsMap: Record<string, string> = {};
        clients.forEach(c => { clientsMap[c.id] = c.name; });

        // Build job list from batches (all batches, not only in_progress)
        const jobList: Job[] = batches.map(batch => {
          const order = ordersMap[batch.orderId];
          const clientName = order ? clientsMap[order.clientId] : 'Unknown';
          const percent = batch.qty > 0 ? Math.round((batch.progress / batch.qty) * 100) : 0;

          // Format stages
          const stagesDisplay: StageDisplay[] = batch.stages.map(s => ({
            stage: s.stage,
            status: s.status,
            updated: formatDateTime(s.updatedAt),
          }));

          // Find documents belonging to this order
          const orderDocs = documents.filter(doc => doc.ownerType === 'order' && doc.ownerId === batch.orderId);
          const jobDocs: JobDocument[] = orderDocs.map(doc => ({
            id: doc.id,
            name: doc.name,
            fileName: doc.fileName,
            type: doc.type,
            sizeKB: doc.sizeKB,
            uploadedDate: doc.uploadedDate,
            reorderCount: doc.reorderCount,
            downloadUrl: doc.url,
          }));

          return {
            id: batch.id,   // keep batch id as primary identifier
            done: batch.progress,
            total: batch.qty,
            percent,
            stages: stagesDisplay,
            info: {
              client: clientName,
              batch: batch.id,
              product: batch.product,
              qty: batch.qty,
              status: batch.status,
              priority: batch.priority,
              deadline: formatDate(batch.deadline),
              team: batch.assignedTo || 'Unassigned',
              notes: batch.notes || '—',
            },
            documents: jobDocs,
          };
        });

        // Filter if jobId provided
        let filteredJobs = jobList;
        if (jobId) {
          // Try to match as batch ID directly, or as numeric part (e.g., "1022" vs "B-260425-M")
          const matchAsBatchId = jobList.find(j => j.id === jobId);
          if (matchAsBatchId) {
            filteredJobs = [matchAsBatchId];
          } else {
            // Try numeric suffix: find any batch id containing "-{jobId}-"
            const numericMatch = jobList.find(j => j.id.includes(`-${jobId}-`));
            if (numericMatch) {
              filteredJobs = [numericMatch];
            } else {
              filteredJobs = [];
            }
          }
        }

        setJobs(filteredJobs);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load work view data:', err);
        setError('Could not load work view. Please try again later.');
        setLoading(false);
      });
  }, [jobId]);

  const title = jobs.length === 1
    ? `Work View — ${jobs[0].id} (Order #${jobs[0].info.batch})`
    : 'Order Work View';

  if (loading) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="loading-state">Loading jobs…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  if (jobId && jobs.length === 0) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
        <Topbar title="Work View" />
        <div className="error-state">Job not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-production' : 'order-work-view'}>
      <Topbar title={title} />
      {jobs.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>

          {/* Work Progress */}
          <article className="box">
            <h3>Work Progress — {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed ({j.percent}%)</p>
            <ProgressBar percent={j.percent} style={{ margin: '8px 0 14px' }} />
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

          {/* Job Info + Documents */}
          <aside className="box">
            <h3>Job Info</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, margin: '0 0 16px' }}>
              <li><strong>Client:</strong> {j.info.client}</li>
              <li><strong>Batch Code:</strong> {j.info.batch}</li>
              <li><strong>Product:</strong> {j.info.product}</li>
              <li><strong>Quantity:</strong> {j.info.qty}</li>
              <li><strong>Status:</strong> {j.info.status}</li>
              <li><strong>Priority:</strong> {j.info.priority}</li>
              <li><strong>Deadline:</strong> {j.info.deadline}</li>
              <li><strong>Assigned To:</strong> {j.info.team}</li>
              <li><strong>Notes:</strong> {j.info.notes}</li>
            </ul>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <h3 style={{ marginBottom: 10 }}>Documents</h3>
              <JobDocuments docs={j.documents} />
            </div>
          </aside>

        </section>
      ))}
    </AppShell>
  );
}
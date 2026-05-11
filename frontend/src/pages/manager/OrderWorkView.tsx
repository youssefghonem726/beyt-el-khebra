import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

// ── Types ──────────────────────────────────────────────────────────────────

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
  stages: Stage[];
  info: JobInfo;
  documents?: JobDocument[];
}

interface Props { jobId?: string; role?: 'manager' | 'owner'; }

// ── Helpers ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  PDF   : '#e53e3e',
  AI    : '#f97316',
  PSD   : '#2563eb',
  PNG   : '#059669',
  JPG   : '#059669',
  SVG   : '#aa3bff',
  Other : '#6b7280',
};

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = doc.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── JobDocuments ───────────────────────────────────────────────────────────

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
            {/* File icon */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>

            {/* Name + filename */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {doc.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted, #999)' }}>
                {doc.fileName} · {formatSize(doc.sizeKB)}
              </div>
            </div>

            {/* Type chip */}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              background: chipColor + '18', color: chipColor, flexShrink: 0,
            }}>
              {doc.type}
            </span>

            {/* Download button */}
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

// ── OrderWorkView ──────────────────────────────────────────────────────────

export default function OrderWorkView({ jobId, role = 'manager' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/work-jobs.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`);
        return res.json() as Promise<Job[]>;
      })
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const displayed = jobId
    ? jobs.filter((j) => j.id === `Job #${jobId}`)
    : jobs;

  const title = displayed.length === 1
    ? `Work View — ${displayed[0].id}`
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

  if (jobId && displayed.length === 0) {
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
      {displayed.map((j) => (
        <section key={j.id} className="split" style={{ marginBottom: 14 }}>

          {/* ── Work Progress ── */}
          <article className="box">
            <h3>Work Progress — {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed ({j.percent}%)</p>
            <ProgressBar percent={j.percent} style={{ margin: '8px 0 14px' }} />
            <table>
              <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
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

          {/* ── Job Info + Documents ── */}
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
              <JobDocuments docs={j.documents ?? []} />
            </div>
          </aside>

        </section>
      ))}
    </AppShell>
  );
}

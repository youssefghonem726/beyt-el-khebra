import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Stage { stage: string; status: string; updatedAt: string; }

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
  assignedTo: string;
  notes: string;
  stages: Stage[];
}

const STEPS = [
  'File Approved',
  'Printing Started',
  'Finishing',
  'Quality Check',
  'Ready for Delivery',
];

function currentStep(pct: number): number {
  if (pct === 0)   return 0;
  if (pct < 25)    return 1;
  if (pct < 55)    return 2;
  if (pct < 80)    return 3;
  if (pct < 100)   return 4;
  return 5;
}

export default function Production() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);

  useEffect(() => {
    fetch('/data/jobs.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Job[]) => {
        setJobs(data);
        setSelectedJob(data[0] ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load jobs:', err);
        setError('Could not load production data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const pct = (j: Job) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;

  const activeJobs    = jobs.filter(j => j.status !== 'completed').length;
  const inProgress    = jobs.filter(j => j.status === 'in_progress').length;
  const onHold        = jobs.filter(j => j.status === 'on_hold').length;
  const completed     = jobs.filter(j => j.status === 'completed').length;

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
      <AppShell role="owner" activePage="owner-production">
        <Topbar title="Production Dashboard" />
        <div className="loading-state">Loading production data...</div>
      </AppShell>
    );
  }

  if (error || jobs.length === 0) {
    return (
      <AppShell role="owner" activePage="owner-production">
        <Topbar title="Production Dashboard" />
        <div className="error-state">{error ?? 'No jobs available.'}</div>
      </AppShell>
    );
  }

  const step = selectedJob ? currentStep(pct(selectedJob)) : 0;

  return (
    <AppShell role="owner" activePage="owner-production">
      <Topbar title="Production Dashboard" />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs"  value={activeJobs} sub="Currently in queue"     />
        <StatCard label="In Progress"  value={inProgress}  sub="Being worked on"       />
        <StatCard label="On Hold"      value={onHold}      sub="Waiting on something"  />
        <StatCard label="Completed"    value={completed}   sub="Finished jobs"         />
      </section>

      <section className="production-layout">
        {/* ── Job list ── */}
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>All Jobs</h3>
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
                  style={{
                    padding: '5px 14px', background: '#2f3640', color: '#fff',
                    border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}
                >
                  ✕ Close
                </button>
              </div>
              <div style={{ padding: 20 }}>
                {/* Work Progress */}
                <h3 style={{ marginBottom: 8 }}>Work Progress — {selectedJob.id}</h3>
                <ProgressBar percent={p} color={p === 100 ? 'green' : p >= 50 ? 'orange' : undefined} />
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 16 }}>
                  {selectedJob.progress} / {selectedJob.qty} completed ({p}%)
                </p>
                <table style={{ marginBottom: 24 }}>
                  <thead>
                    <tr><th>Stage</th><th>Status</th><th>Updated At</th></tr>
                  </thead>
                  <tbody>
                    {selectedJob.stages.map(st => (
                      <tr key={st.stage}>
                        <td>{st.stage}</td>
                        <td><StatusBadge status={st.status} /></td>
                        <td>{st.updatedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Job Info */}
                <h3 style={{ marginBottom: 12 }}>Job Info</h3>
                <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                  <p><strong>Client:</strong> {selectedJob.client}</p>
                  <p><strong>Batch Code:</strong> {selectedJob.batchCode}</p>
                  <p><strong>Product:</strong> {selectedJob.product}</p>
                  <p><strong>Quantity:</strong> {selectedJob.qty}</p>
                  <p><strong>Status:</strong> <StatusBadge status={selectedJob.status} /></p>
                  <p><strong>Priority:</strong> {selectedJob.priority}</p>
                  <p><strong>Deadline:</strong> {selectedJob.dueDate}</p>
                  <p><strong>Assigned To:</strong> {selectedJob.assignedTo}</p>
                  <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selectedJob.notes}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
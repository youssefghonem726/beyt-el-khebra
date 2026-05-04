import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

interface Job {
  id: string;
  client: string;
  product: string;
  qty: number;
  status: string;
  progress: number;
  dueDate: string;
  paper: string;
}

const JOBS: Job[] = [
  { id: 'Job #1022', client: 'Client Name',   product: 'Business Cards', qty: 1000, status: 'IN PROGRESS', progress: 600,  dueDate: '24 Apr 2025', paper: 'Matte 350gsm'  },
  { id: 'Job #1021', client: 'Design Hub',     product: 'Flyers',         qty: 2000, status: 'IN PROGRESS', progress: 1200, dueDate: '25 Apr 2025', paper: 'Glossy 130gsm' },
  { id: 'Job #1020', client: 'Marketing Co.', product: 'Brochures',      qty: 500,  status: 'ON HOLD',     progress: 0,    dueDate: '28 Apr 2025', paper: 'Satin 170gsm'  },
  { id: 'Job #1019', client: 'Retail Plus',   product: 'Stickers',       qty: 1000, status: 'COMPLETED',   progress: 1000, dueDate: '20 Apr 2025', paper: 'Vinyl Matte'   },
];

export default function Production({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job>(JOBS[0]);

  const filtered = JOBS.filter((j) => {
    const q = query.toLowerCase();
    const matchQ = !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q);
    const matchS = !filterStatus || j.status.toLowerCase().includes(filterStatus.toLowerCase());
    return matchQ && matchS;
  });

  const pct = (j: Job) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;

  return (
    <AppShell role="owner" activePage="owner-production" onNavigate={onNavigate}>
      <Topbar title="Production Dashboard" userName="Production User" />
      <section className="production-layout">
        <div className="stack">
          <div className="grid-4">
            <StatCard label="All Active Jobs" value={12} />
            <StatCard label="In Progress" value={6} />
            <StatCard label="On Hold" value={4} />
            <StatCard label="Due Today" value={2} />
          </div>

          <article className="table-wrap">
            <div className="table-head">
              <div className="search-container">
                <input className="input" type="search" placeholder="Search by job number or client..." value={query} onChange={(e) => setQuery(e.target.value)} />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>Status</label>
                      <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        <option>In Progress</option><option>On Hold</option><option>Completed</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
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
                  className={`card${selectedJob.id === j.id ? ' card--selected' : ''}`}
                  onClick={() => setSelectedJob(j)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4>{j.id}</h4>
                    <StatusBadge status={j.status} />
                  </div>
                  <p style={{ marginBottom: 2 }}><strong>Client:</strong> {j.client}</p>
                  <p style={{ marginBottom: 2 }}><strong>Product:</strong> {j.product} &mdash; Qty: {j.qty}</p>
                  <p style={{ marginBottom: 6 }}><strong>Due:</strong> {j.dueDate}</p>
                  <ProgressBar percent={pct(j)} />
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>{j.progress} / {j.qty} ({pct(j)}%)</p>
                  <div className="card-actions">
                    <button className="btn" onClick={(e) => { e.stopPropagation(); onNavigate('order-work-view'); }}>View</button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <aside className="box">
          <h3>{selectedJob.id}</h3>
          <p className="muted">{selectedJob.status}</p>
          <div className="line" />
          <h3>Job Information</h3>
          <ul>
            <li>Client: {selectedJob.client}</li>
            <li>Product: {selectedJob.product}</li>
            <li>Quantity: {selectedJob.qty}</li>
            <li>Paper: {selectedJob.paper}</li>
            <li>Due Date: {selectedJob.dueDate}</li>
          </ul>
          <div className="line" />
          <h3>Progress</h3>
          <p><strong>{selectedJob.progress} / {selectedJob.qty}</strong> ({pct(selectedJob)}%)</p>
          <ProgressBar percent={pct(selectedJob)} />
          <div className="line" />
          <h3>Next Steps</h3>
          <ul>
            <li>File approved</li>
            <li>Printing started</li>
            <li>Finishing</li>
            <li>Quality check</li>
            <li>Ready for delivery</li>
          </ul>
        </aside>
      </section>
    </AppShell>
  );
}

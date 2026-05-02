import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

const JOBS = [
  { id: 'Job #1022', client: 'Client Name', product: 'Business Cards', qty: 1000, status: 'IN PROGRESS', progress: 600, dueDate: '24 Apr 2025' },
  { id: 'Job #1021', client: 'Design Hub', product: 'Flyers', qty: 2000, status: 'IN PROGRESS', progress: 1200, dueDate: '25 Apr 2025' },
  { id: 'Job #1020', client: 'Marketing Co.', product: 'Brochures', qty: 500, status: 'ON HOLD', progress: 0, dueDate: '28 Apr 2025' },
  { id: 'Job #1019', client: 'Retail Plus', product: 'Stickers', qty: 1000, status: 'COMPLETED', progress: 1000, dueDate: '20 Apr 2025' },
];

export default function ActiveJobs({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = JOBS.filter((j) => {
    const q = query.toLowerCase();
    return !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q);
  });

  return (
    <AppShell role="manager" activePage="active-jobs" onNavigate={onNavigate}>
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
                      <select className="select"><option value="">All Status</option><option>In Progress</option><option>On Hold</option><option>Completed</option></select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
                  </div>
                )}
              </div>
            </div>
            <div className="job-cards">
              {filtered.map((j) => (
                <article key={j.id} className="card">
                  <h4>{j.id}</h4>
                  <p><strong>Client:</strong> {j.client}</p>
                  <p><strong>Product:</strong> {j.product}</p>
                  <p><strong>Quantity:</strong> {j.qty}</p>
                  <p><strong>Status:</strong> <StatusBadge status={j.status} /></p>
                  <p><strong>Progress:</strong> {j.progress} / {j.qty}</p>
                  <p><strong>Due Date:</strong> {j.dueDate}</p>
                  <div className="card-actions">
                    <button className="btn" onClick={() => onNavigate('order-work-view')}>View</button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
        <aside className="box">
          <h3>Job #1022</h3>
          <p className="muted">IN PROGRESS</p>
          <div className="line" />
          <h3>Job Information</h3>
          <ul>
            <li>Client: Client Name</li><li>Product: Business Cards</li>
            <li>Quantity: 1000</li><li>Paper: Matte 350gsm</li><li>Due Date: 24 Apr 2025</li>
          </ul>
          <div className="line" />
          <h3>Progress</h3>
          <p><strong>600 / 1000</strong> (60%)</p>
          <ProgressBar percent={60} />
          <div className="line" />
          <h3>Next Steps</h3>
          <ul>
            <li>File approved</li><li>Printing started</li><li>Finishing</li><li>Quality check</li><li>Ready for delivery</li>
          </ul>
        </aside>
      </section>
    </AppShell>
  );
}

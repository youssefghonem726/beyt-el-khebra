import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; role?: 'manager' | 'owner'; }

const BATCHES = [
  { code: 'B-260426-P', order: '#1033', client: 'Client Name', status: 'UNPRICED', date: '26 Apr 2026', page: 'manager-order-details' },
  { code: 'B-260425-M', order: '#1032', client: 'Ahmed Store', status: 'IN_PROGRESS', date: '25 Apr 2026', page: 'order-work-view' },
];

export default function BatchLookup({ onNavigate, role = 'manager' }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = BATCHES.filter((b) => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'batch-lookup'} onNavigate={onNavigate}>
      <Topbar title="Batch Lookup & Search" userName="Manager / Owner" />
      <section className="table-wrap">
        <div className="table-head">
          <div className="actions-inline" style={{ flex: 1 }}>
            <div className="search-container">
              <input className="input" type="search" placeholder="Search by batch code, order ID, product, or date..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select"><option value="">All Status</option><option>Active</option><option>Completed</option></select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
                </div>
              )}
            </div>
          </div>
          <button className="btn">Export Search Query</button>
        </div>
        <table>
          <thead><tr><th>Batch Code</th><th>Order</th><th>Client Name</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="no-results">No matching results</td></tr>
              : filtered.map((b) => (
                <tr key={b.code}>
                  <td>{b.code}</td>
                  <td>{b.order}</td>
                  <td>{b.client}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.date}</td>
                  <td><button className="btn" onClick={() => onNavigate(b.page)}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';

interface Props { role?: 'manager' | 'owner'; }

interface Stage { stage: string; status: string; updatedAt: string; }
interface Batch {
  code: string; order: string; client: string; status: string; date: string;
  product: string; qty: number; progress: number; priority: string;
  assignedTo: string; deadline: string; notes?: string; stages: Stage[];
  clientInfo: { address: string; phone: string; taxId: string; };
}

const BATCHES: Batch[] = [
  {
    code: 'B-260426-P', order: '#1033', client: 'Client Name', status: 'UNPRICED', date: '26 Apr 2026',
    product: 'Packaging Sleeves', qty: 2500, progress: 0, priority: 'Normal',
    assignedTo: 'Unassigned', deadline: '30 Apr 2026',
    notes: 'Awaiting pricing approval before production can start.',
    stages: [
      { stage: 'Prepress',  status: 'PENDING',      updatedAt: '—' },
      { stage: 'Printing',  status: 'NOT STARTED',  updatedAt: '—' },
      { stage: 'Finishing', status: 'NOT STARTED',  updatedAt: '—' },
    ],
    clientInfo: { address: '45 El Hegaz St, Heliopolis, Cairo', phone: '+20 100 123 4567', taxId: 'TAX-20045' },
  },
  {
    code: 'B-260425-M', order: '#1032', client: 'Ahmed Store', status: 'IN_PROGRESS', date: '25 Apr 2026',
    product: 'Business Cards', qty: 1000, progress: 600, priority: 'High',
    assignedTo: 'Production Team A', deadline: '28 Apr 2026',
    notes: 'Standard business cards, double-sided, matte finish.',
    stages: [
      { stage: 'Prepress',  status: 'DONE',        updatedAt: '26 Apr 2026, 9:00 AM'  },
      { stage: 'Printing',  status: 'IN_PROGRESS', updatedAt: '26 Apr 2026, 4:20 PM'  },
      { stage: 'Finishing', status: 'WAITING',     updatedAt: '—'                      },
    ],
    clientInfo: { address: '12 El Nasr St, Cairo, Egypt', phone: '+20 112 987 6543', taxId: 'TAX-10023' },
  },
];

export default function BatchLookup({ role = 'manager' }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Batch | null>(null);

  const filtered = BATCHES.filter((b) => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  const pct = (b: Batch) => b.qty > 0 ? Math.round((b.progress / b.qty) * 100) : 0;

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'batch-lookup'}>
      <Topbar title="Batch Lookup & Search" />
      <section className="table-wrap">
        <div className="table-head">
          <div className="actions-inline" style={{ flex: 1 }}>
            <div className="search-container">
              <input className="input" type="search" placeholder="Search by batch code, order ID, client..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select"><option value="">All Status</option><option>Active</option><option>Completed</option></select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                </div>
              )}
            </div>
          </div>
          <button className="btn" onClick={() => {
            const header = 'Batch Code,Order,Client,Status,Date';
            const rows = filtered.map((b) => `${b.code},${b.order},${b.client},${b.status},${b.date}`);
            downloadText('batch-export.csv', [header, ...rows]);
          }}>Export Search Query</button>
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
                  <td><button className="btn" onClick={() => setSelected(b)}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 660, boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border, #e4e6eb)', position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 1 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Batch {selected.code}</h2>
              <button onClick={() => setSelected(null)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✕ Close</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ fontSize: 13 }}>Order {selected.order} · {selected.date}</p>
                <StatusBadge status={selected.status} />
              </div>

              <h4 style={{ marginBottom: 8 }}>Job Details</h4>
              <div className="form-grid-2" style={{ fontSize: 13, gap: 6, marginBottom: 14 }}>
                <p><strong>Client:</strong> {selected.client}</p>
                <p><strong>Product:</strong> {selected.product}</p>
                <p><strong>Quantity:</strong> {selected.qty} pcs</p>
                <p><strong>Priority:</strong> {selected.priority}</p>
                <p><strong>Deadline:</strong> {selected.deadline}</p>
                <p><strong>Assigned To:</strong> {selected.assignedTo}</p>
                {selected.notes && <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selected.notes}</p>}
              </div>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>Production Progress</h4>
              <ProgressBar percent={pct(selected)} color={pct(selected) === 100 ? 'green' : pct(selected) >= 50 ? 'orange' : undefined} />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
                {selected.progress} / {selected.qty} printed ({pct(selected)}%)
              </p>

              <table style={{ marginBottom: 14 }}>
                <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
                <tbody>
                  {selected.stages.map((s) => (
                    <tr key={s.stage}>
                      <td>{s.stage}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>{s.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>Client Info</h4>
              <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                <p><strong>{selected.client}</strong></p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.address}</p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.phone}</p>
                <p style={{ color: 'var(--muted)' }}>Tax ID: {selected.clientInfo.taxId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

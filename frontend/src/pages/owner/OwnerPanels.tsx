import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';
// ─── Manager Orders Panel ─────────────────────────────────────────────────────

const PENDING_ORDERS = [
  { id: '#1033', status: 'UNPRICED',         client: 'Client Name' },
  { id: '#1031', status: 'PENDING APPROVAL', client: 'Design Hub'  },
];
const WORKING_ORDERS = [
  { id: '#1029', status: 'IN_PROGRESS', client: 'Retail Plus',   product: 'Brochures',  qty: 3000, progress: 1200, paper: 'Gloss 170gsm' },
  { id: '#1026', status: 'FINISHING',   client: 'Marketing Co.', product: 'Gift Bags',  qty: 800,  progress: 600,  paper: 'Kraft'        },
];
const COMPLETED_ORDERS = [
  { id: '#1024', status: 'COMPLETED', client: 'Client Name', completedAt: '26 Apr 2026, 6:10 PM' },
  { id: '#1020', status: 'COMPLETED', client: 'Ahmed Store', completedAt: '26 Apr 2026, 4:45 PM' },
];

const ORDER_DETAIL: Record<string, { product: string; qty: number; paper: string; notes: string }> = {
  '#1033': { product: 'Packaging Sleeves', qty: 1500, paper: 'Glossy 300gsm', notes: 'Awaiting price approval from client.' },
  '#1031': { product: 'Flyers A5',         qty: 2000, paper: 'Matt 130gsm',   notes: 'Pending client approval on design.' },
  '#1024': { product: 'Packaging Sleeves', qty: 1500, paper: 'Glossy 300gsm', notes: 'Completed and dispatched.' },
  '#1020': { product: 'Business Cards',    qty: 500,  paper: 'Silk 350gsm',   notes: 'Completed and collected by client.' },
};

const WORK_VIEW_STAGES: Record<string, { stage: string; status: string; updated: string }[]> = {
  '#1029': [
    { stage: 'File Approved', status: 'DONE',        updated: '25 Apr 2026, 9:00 AM'  },
    { stage: 'Printing',      status: 'IN_PROGRESS', updated: '26 Apr 2026, 11:30 AM' },
    { stage: 'Finishing',     status: 'PENDING',     updated: '—'                     },
  ],
  '#1026': [
    { stage: 'File Approved', status: 'DONE',        updated: '24 Apr 2026, 8:00 AM'  },
    { stage: 'Printing',      status: 'DONE',        updated: '25 Apr 2026, 3:00 PM'  },
    { stage: 'Finishing',     status: 'IN_PROGRESS', updated: '26 Apr 2026, 10:00 AM' },
  ],
};

type PanelView =
  | { kind: 'order';     id: string; client: string; status: string }
  | { kind: 'work-view'; id: string; client: string; product: string; qty: number; progress: number; paper: string };

export function ManagerOrdersPanel() {
  const [view, setView] = useState<PanelView | null>(null);

  if (view?.kind === 'order') {
    const detail = ORDER_DETAIL[view.id];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>← Back to Orders</button>
        <div className="box">
          <h3 style={{ marginBottom: 12 }}>Order {view.id}</h3>
          <div className="form-grid-2" style={{ fontSize: 14 }}>
            <p><strong>Client:</strong> {view.client}</p>
            <p><strong>Status:</strong> <StatusBadge status={view.status} /></p>
            {detail && (
              <>
                <p><strong>Product:</strong> {detail.product}</p>
                <p><strong>Quantity:</strong> {detail.qty} pcs</p>
                <p><strong>Paper / Material:</strong> {detail.paper}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {detail.notes}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view?.kind === 'work-view') {
    const pct = view.qty > 0 ? Math.round((view.progress / view.qty) * 100) : 0;
    const stages = WORK_VIEW_STAGES[view.id] ?? [];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>← Back to Orders</button>
        <div className="box">
          <h3 style={{ marginBottom: 4 }}>Work View — {view.id}</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{view.client} · {view.product}</p>
          <ProgressBar percent={pct} color={pct === 100 ? 'green' : pct >= 50 ? 'orange' : undefined} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
            {view.progress} / {view.qty} printed ({pct}%)
          </p>
          <table>
            <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
            <tbody>
              {stages.map(s => (
                <tr key={s.stage}>
                  <td>{s.stage}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{s.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-2">
        <article className="table-wrap">
          <div className="table-head"><h3>Pending Orders</h3></div>
          <table>
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {PENDING_ORDERS.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => setView({ kind: 'order', id: o.id, client: o.client, status: o.status })}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="table-wrap">
          <div className="table-head"><h3>Working Orders</h3></div>
          <table>
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {WORKING_ORDERS.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => setView({ kind: 'work-view', id: o.id, client: o.client, product: o.product, qty: o.qty, progress: o.progress, paper: o.paper })}>
                      Work View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <article className="table-wrap">
        <div className="table-head"><h3>Completed Orders</h3></div>
        <table>
          <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Completed At</th><th>Action</th></tr></thead>
          <tbody>
            {COMPLETED_ORDERS.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt}</td>
                <td>
                  <button className="btn" onClick={() => setView({ kind: 'order', id: o.id, client: o.client, status: o.status })}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

// ─── Batch Lookup Panel ───────────────────────────────────────────────────────

interface Batch { code: string; order: string; client: string; status: string; date: string; }

const BATCHES: Batch[] = [
  { code: 'B-260426-P', order: '#1033', client: 'Client Name', status: 'UNPRICED',    date: '26 Apr 2026' },
  { code: 'B-260425-M', order: '#1032', client: 'Ahmed Store', status: 'IN_PROGRESS', date: '25 Apr 2026' },
];

const BATCH_ORDER_DETAIL: Record<string, { product: string; qty: number; paper: string; notes: string }> = {
  '#1033': { product: 'Packaging Sleeves', qty: 1500, paper: 'Glossy 300gsm', notes: 'Awaiting price approval from client.' },
  '#1032': { product: 'Stickers',          qty: 800,  paper: 'Vinyl',         notes: 'Printing in progress, 40% done.' },
};

export function BatchLookupPanel() {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Batch | null>(null);

  const filtered = BATCHES.filter((b) => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  if (selected) {
    const detail = BATCH_ORDER_DETAIL[selected.order];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>
          ← Back to Batch List
        </button>
        <div className="box" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 12 }}>Order {selected.order}</h3>
          <div className="form-grid-2" style={{ fontSize: 14 }}>
            <p><strong>Batch Code:</strong> {selected.code}</p>
            <p><strong>Client:</strong> {selected.client}</p>
            <p><strong>Date:</strong> {selected.date}</p>
            <p><strong>Status:</strong> <StatusBadge status={selected.status} /></p>
            {detail && (
              <>
                <p><strong>Product:</strong> {detail.product}</p>
                <p><strong>Quantity:</strong> {detail.qty} pcs</p>
                <p><strong>Paper / Material:</strong> {detail.paper}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {detail.notes}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-head" style={{ marginBottom: 12 }}>
        <div className="search-container" style={{ flex: 1 }}>
          <input
            className="input"
            type="search"
            placeholder="Search by batch code, order ID, or client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
          {dropdownOpen && (
            <div className="filter-dropdown show">
              <div className="field">
                <label>Status</label>
                <select className="select">
                  <option value="">All Status</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
              </div>
              <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
            </div>
          )}
        </div>
        <button
          className="btn"
          onClick={() => {
            const header = 'Batch Code,Order,Client,Status,Date';
            const rows = filtered.map(b => `${b.code},${b.order},${b.client},${b.status},${b.date}`);
            downloadText('batch-export.csv', [header, ...rows]);
          }}
        >
          Export CSV
        </button>
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr><th>Batch Code</th><th>Order</th><th>Client</th><th>Status</th><th>Date</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="no-results">No matching results</td></tr>
              : filtered.map(b => (
                <tr key={b.code}>
                  <td>{b.code}</td>
                  <td>{b.order}</td>
                  <td>{b.client}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.date}</td>
                  <td>
                    <button className="btn" onClick={() => setSelected(b)}>View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Accounting Panel ─────────────────────────────────────────────────────────

interface Invoice { id: string; order: string; client: string; total: string; status: string; }
interface AccStat  { label: string; value: string | number; sub: string; }

export function AccountingPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats]       = useState<AccStat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/invoices.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/data/accounting-stats.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([inv, st]) => { setInvoices(inv); setStats(st); setLoading(false); })
      .catch(() => { setError('Could not load accounting data.'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-state">Loading accounting data…</div>;
  if (error)   return <div className="error-state">{error}</div>;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {stats.map((s, i) => <StatCard key={i} label={s.label} value={s.value} sub={s.sub} />)}
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr><th>Invoice #</th><th>Order</th><th>Client</th><th>Total</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.order}</td>
                <td>{inv.client}</td>
                <td>{inv.total}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <button className="btn" onClick={() => downloadText(`invoice-${inv.id}.txt`, [
                    `INVOICE: ${inv.id}`, `Order:  ${inv.order}`,
                    `Client: ${inv.client}`, `Total:  ${inv.total}`, `Status: ${inv.status}`,
                  ])}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

interface User { email: string; role: string; status: string; }

export function SettingsPanel() {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });
  const [editEmail, setEditEmail]   = useState<string | null>(null);
  const [editRole, setEditRole]     = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [toast, setToast]           = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const startEdit = (u: User) => { setEditEmail(u.email); setEditRole(u.role); setEditStatus(u.status); };
  const saveEdit  = () => {
    setUsers(prev => prev.map(u => u.email === editEmail ? { ...u, role: editRole, status: editStatus } : u));
    setEditEmail(null);
    showToast('User updated.');
  };

  useEffect(() => {
    fetch('/data/users.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: User[]) => { setUsers(data); setLoading(false); })
      .catch(() => { setError('Could not load users.'); setLoading(false); });
  }, []);

  return (
    <div className="stack">
      <article className="box">
        <h3>Pricing Roles</h3>
        <div className="form-grid-2">
          <div className="field">
            <label>Pricing Owner</label>
            <input className="input" type="text" value={pricing.owner} onChange={e => setPricing(p => ({ ...p, owner: e.target.value }))} />
          </div>
          <div className="field">
            <label>Approval Threshold (EGP)</label>
            <input className="input" type="number" value={pricing.threshold} onChange={e => setPricing(p => ({ ...p, threshold: e.target.value }))} />
          </div>
        </div>
      </article>

      <article className="box">
        <h3>Notification Format (WhatsApp)</h3>
        <div className="field">
          <label>WhatsApp Business Number</label>
          <input className="input" type="text" value={whatsapp.number} onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))} />
        </div>
        <div className="field">
          <label>Message Template</label>
          <textarea className="textarea" value={whatsapp.template} onChange={e => setWhatsapp(w => ({ ...w, template: e.target.value }))} />
        </div>
      </article>

      <article className="box">
        <h3>User Management</h3>
        {loading && <div className="loading-state">Loading users…</div>}
        {error   && <div className="error-state">{error}</div>}
        {!loading && !error && (
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {users.map(u => editEmail === u.email ? (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>
                    <select className="select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                      <option>Owner</option><option>Manager</option><option>Staff</option>
                    </select>
                  </td>
                  <td>
                    <select className="select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option>Active</option><option>Inactive</option>
                    </select>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn primary" onClick={saveEdit}>Save</button>
                    <button className="btn" onClick={() => setEditEmail(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td><button className="btn" onClick={() => startEdit(u)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
      {toast && <div className="success-toast">{toast}</div>}
    </div>
  );
}

// ─── Production Panel ─────────────────────────────────────────────────────────

interface Job { id: string; client: string; product: string; qty: number; status: string; progress: number; dueDate: string; paper: string; }

export function ProductionPanel() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [query, setQuery]     = useState('');

  const pct = (j: Job) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;
  const progressColor = (p: number): 'green' | 'orange' | undefined =>
    p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

  useEffect(() => {
    fetch('/data/jobs.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Job[]) => { setJobs(data); setLoading(false); })
      .catch(() => { setError('Could not load production data.'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-state">Loading jobs…</div>;
  if (error)   return <div className="error-state">{error}</div>;

  const active    = jobs.filter(j => j.status.toUpperCase() !== 'COMPLETED').length;
  const inProg    = jobs.filter(j => j.status.toUpperCase() === 'IN PROGRESS').length;
  const onHold    = jobs.filter(j => j.status.toUpperCase() === 'ON HOLD').length;
  const completed = jobs.filter(j => j.status.toUpperCase() === 'COMPLETED').length;

  const filtered = jobs.filter(j => {
    const q = query.toLowerCase();
    return !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs"  value={active}    sub="Currently in queue"   />
        <StatCard label="In Progress"  value={inProg}    sub="Being worked on"      />
        <StatCard label="On Hold"      value={onHold}    sub="Waiting on something" />
        <StatCard label="Completed"    value={completed} sub="Finished jobs"        />
      </div>
      <input
        className="input"
        type="search"
        placeholder="Search by job ID, client or product…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="job-cards">
        {filtered.length === 0
          ? <p className="muted">No matching jobs.</p>
          : filtered.map(j => (
            <article key={j.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <h4>{j.id}</h4>
                <StatusBadge status={j.status} />
              </div>
              <p><strong>Client:</strong> {j.client} | <strong>Product:</strong> {j.product} — {j.qty} pcs</p>
              <p style={{ marginBottom: 6 }}><strong>Due:</strong> {j.dueDate}</p>
              <ProgressBar percent={pct(j)} color={progressColor(pct(j))} />
              <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                {j.progress} / {j.qty} printed ({pct(j)}%)
              </p>
            </article>
          ))
        }
      </div>
    </div>
  );
}

// ─── Completed Jobs Panel ─────────────────────────────────────────────────────

const COMPLETED_JOBS = [
  {
    id: 'Order #1024', done: 1500, total: 1500,
    stages: [
      { stage: 'Prepress',  status: 'DONE', updated: '26 Apr 2026, 9:00 AM'  },
      { stage: 'Printing',  status: 'DONE', updated: '27 Apr 2026, 2:00 PM'  },
      { stage: 'Finishing', status: 'DONE', updated: '27 Apr 2026, 6:10 PM'  },
    ],
    info: { client: 'Client Name', batch: 'B-260425-M', product: 'Packaging Sleeves', qty: 1500, completion: '27 Apr 2026' },
  },
  {
    id: 'Order #1023', done: 800, total: 800,
    stages: [
      { stage: 'Prepress',  status: 'DONE', updated: '26 Apr 2026, 10:00 AM' },
      { stage: 'Printing',  status: 'DONE', updated: '27 Apr 2026, 1:00 PM'  },
      { stage: 'Finishing', status: 'DONE', updated: '27 Apr 2026, 4:45 PM'  },
    ],
    info: { client: 'Retail Plus', batch: 'B-260426-R', product: 'Stickers', qty: 800, completion: '27 Apr 2026' },
  },
];

export function CompletedJobsPanel() {
  return (
    <div className="stack">
      {COMPLETED_JOBS.map(j => (
        <div key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress — {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
            <table>
              <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
              <tbody>
                {j.stages.map(s => (
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
            <h3>Job Info</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>Client:</strong> {j.info.client}</li>
              <li><strong>Batch Code:</strong> {j.info.batch}</li>
              <li><strong>Product:</strong> {j.info.product}</li>
              <li><strong>Quantity:</strong> {j.info.qty}</li>
              <li><strong>Completion Date:</strong> {j.info.completion}</li>
            </ul>
          </aside>
        </div>
      ))}
    </div>
  );
}

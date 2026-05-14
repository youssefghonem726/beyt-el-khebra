// OwnerPanels.tsx (updated)

import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';

// ─── Helper functions (shared) ───────────────────────────────────────────────

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getShortOrderId(orderId: string): string {
  const match = orderId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : orderId;
}

function formatAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Manager Orders Panel ────────────────────────────────────────────────────

interface OrderBrief {
  id: string;
  displayId: string;
  client: string;
  status: string;
}

interface WorkOrder extends OrderBrief {
  product: string;
  qty: number;
  progress: number;
  paper: string;
}

interface CompletedOrder extends OrderBrief {
  completedAt: string;
}

interface OrderDetail {
  product: string;
  qty: number;
  paper: string;
  notes: string;
}

interface WorkStage {
  stage: string;
  status: string;
  updated: string;
}

type PanelView =
  | { kind: 'order'; id: string; displayId: string; client: string; status: string }
  | { kind: 'work-view'; id: string; displayId: string; client: string; product: string; qty: number; progress: number; paper: string };

export function ManagerOrdersPanel() {
  const [view, setView] = useState<PanelView | null>(null);
  const [pending, setPending] = useState<OrderBrief[]>([]);
  const [working, setWorking] = useState<WorkOrder[]>([]);
  const [completed, setCompleted] = useState<CompletedOrder[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [workStages, setWorkStages] = useState<Record<string, WorkStage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, clientsData]) => {
        const orders = ordersData;
        const batches = batchesData;
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));

        // Helper to build order brief
        const buildBrief = (order: any): OrderBrief => ({
          id: order.id,
          displayId: getShortOrderId(order.id),
          client: clientsMap.get(order.clientId) || 'Unknown',
          status: order.status,
        });

        // Pending: unpriced_pending + priced_pending_confirmation
        const pendingOrders = orders
          .filter(o => o.status === 'unpriced_pending' || o.status === 'priced_pending_confirmation')
          .map(buildBrief);

        // Working: in_progress orders (or also from batches)
        const workingOrders = orders
          .filter(o => o.status === 'in_progress')
          .map(buildBrief);

        // Completed: completed or canceled
        const completedOrders = orders
          .filter(o => o.status === 'completed' || o.status === 'canceled')
          .map(o => ({
            ...buildBrief(o),
            completedAt: formatDate(o.deliveryDate || o.orderDate),
          }));

        // Build order details (product, qty, paper, notes) from orders + batches
        const details: Record<string, OrderDetail> = {};
        orders.forEach((order: any) => {
          const batch = batches.find(b => b.orderId === order.id);
          details[order.id] = {
            product: order.product,
            qty: batch?.qty || order.specs?.qty || 0,
            paper: order.specs?.paper || batch?.paper || '—',
            notes: batch?.notes || order.specs?.description || '—',
          };
        });

        // Build work view stages from batches
        const stagesMap: Record<string, WorkStage[]> = {};
        batches.forEach((batch: any) => {
          if (batch.stages) {
            stagesMap[batch.orderId] = batch.stages.map(s => ({
              stage: s.stage,
              status: s.status,
              updated: formatDateTime(s.updatedAt),
            }));
          }
        });

        setPending(pendingOrders);
        setWorking(workingOrders.map(w => {
          const batch = batches.find(b => b.orderId === w.id);
          return {
            ...w,
            product: w.product, // from order
            qty: batch?.qty || 0,
            progress: batch?.progress || 0,
            paper: w.specs?.paper || batch?.paper || '—',
          };
        }));
        setCompleted(completedOrders);
        setOrderDetails(details);
        setWorkStages(stagesMap);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load manager orders data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading orders…</div>;
  if (error) return <div className="error-state">{error}</div>;

  // Detail view for an order (pending or completed)
  if (view?.kind === 'order') {
    const detail = orderDetails[view.id];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>← Back to Orders</button>
        <div className="box">
          <h3 style={{ marginBottom: 12 }}>Order {view.displayId}</h3>
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

  // Work view for an in-progress order
  if (view?.kind === 'work-view') {
    const pct = view.qty > 0 ? Math.round((view.progress / view.qty) * 100) : 0;
    const stages = workStages[view.id] || [];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>← Back to Orders</button>
        <div className="box">
          <h3 style={{ marginBottom: 4 }}>Work View — {view.displayId}</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{view.client} · {view.product}</p>
          <ProgressBar percent={pct} color={pct === 100 ? 'green' : pct >= 50 ? 'orange' : undefined} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
            {view.progress} / {view.qty} printed ({pct}%)
          </p>
          <table className="orders-table">
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

  // Main table view
  return (
    <div className="stack">
      <div className="grid-2">
        {/* Pending Orders */}
        <article className="table-wrap">
          <div className="table-head"><h3>Pending Orders</h3></div>
          <table className="orders-table">
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {pending.map(o => (
                <tr key={o.id}>
                  <td>{o.displayId}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => setView({ kind: 'order', id: o.id, displayId: o.displayId, client: o.client, status: o.status })}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={4}>No pending orders</td></tr>}
            </tbody>
          </table>
        </article>

        {/* Working Orders */}
        <article className="table-wrap">
          <div className="table-head"><h3>Working Orders</h3></div>
          <table className="orders-table">
            <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Action</th></tr></thead>
            <tbody>
              {working.map(o => (
                <tr key={o.id}>
                  <td>{o.displayId}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => setView({ kind: 'work-view', id: o.id, displayId: o.displayId, client: o.client, product: o.product, qty: o.qty, progress: o.progress, paper: o.paper })}>
                      Work View
                    </button>
                  </td>
                </tr>
              ))}
              {working.length === 0 && <tr><td colSpan={4}>No working orders</td></tr>}
            </tbody>
          </table>
        </article>
      </div>

      {/* Completed Orders */}
      <article className="table-wrap">
        <div className="table-head"><h3>Completed Orders</h3></div>
        <table className="orders-table">
          <thead><tr><th>Order</th><th>Status</th><th>Client</th><th>Completed At</th><th>Action</th></tr></thead>
          <tbody>
            {completed.map(o => (
              <tr key={o.id}>
                <td>{o.displayId}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt}</td>
                <td>
                  <button className="btn" onClick={() => setView({ kind: 'order', id: o.id, displayId: o.displayId, client: o.client, status: o.status })}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {completed.length === 0 && <tr><td colSpan={5}>No completed orders</td></tr>}
          </tbody>
        </table>
      </article>
    </div>
  );
}

// ─── Batch Lookup Panel ───────────────────────────────────────────────────────

interface BatchView {
  code: string;
  order: string;
  client: string;
  status: string;
  date: string;
}

export function BatchLookupPanel() {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<BatchView | null>(null);
  const [batches, setBatches] = useState<BatchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([batchesData, ordersData, clientsData]) => {
        const ordersMap = new Map(ordersData.map(o => [o.id, o]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));

        const views: BatchView[] = batchesData.map((b: any) => {
          const order = ordersMap.get(b.orderId);
          return {
            code: b.id,
            order: order ? getShortOrderId(order.id) : b.orderId,
            client: order ? clientsMap.get(order.clientId) || 'Unknown' : 'Unknown',
            status: b.status,
            date: formatDate(order?.orderDate || null),
          };
        });
        setBatches(views);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load batch data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading batches…</div>;
  if (error) return <div className="error-state">{error}</div>;

  const filtered = batches.filter(b => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  if (selected) {
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>← Back to Batch List</button>
        <div className="box">
          <h3 style={{ marginBottom: 12 }}>Batch {selected.code}</h3>
          <div className="form-grid-2" style={{ fontSize: 14 }}>
            <p><strong>Order:</strong> {selected.order}</p>
            <p><strong>Client:</strong> {selected.client}</p>
            <p><strong>Date:</strong> {selected.date}</p>
            <p><strong>Status:</strong> <StatusBadge status={selected.status} /></p>
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
        <button className="btn" onClick={() => {
          const header = 'Batch Code,Order,Client,Status,Date';
          const rows = filtered.map(b => `${b.code},${b.order},${b.client},${b.status},${b.date}`);
          downloadText('batch-export.csv', [header, ...rows]);
        }}>
          Export CSV
        </button>
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead><tr><th>Batch Code</th><th>Order</th><th>Client</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
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
                  <td><button className="btn" onClick={() => setSelected(b)}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Accounting Panel ─────────────────────────────────────────────────────────

export function AccountingPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string | number; sub: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/invoices.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([invoicesData, clientsData]) => {
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));
        const enriched = invoicesData.map((inv: any) => ({
          id: inv.id,
          order: getShortOrderId(inv.orderId),
          client: clientsMap.get(inv.clientId) || 'Unknown',
          total: formatAmount(inv.amount),
          status: inv.status,
        }));

        // Compute stats
        const paidTotal = invoicesData.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.amount, 0);
        const pendingTotal = invoicesData.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + i.amount, 0);
        const paidCount = invoicesData.filter((i: any) => i.status === 'paid').length;
        const unpaidCount = invoicesData.filter((i: any) => i.status !== 'paid').length;

        const statsData = [
          { label: 'Revenue Snapshot', value: `EGP ${(paidTotal / 1000).toFixed(0)}K`, sub: 'Total paid invoices' },
          { label: 'Pending Collection', value: `EGP ${(pendingTotal / 1000).toFixed(0)}K`, sub: 'Awaiting payment' },
          { label: 'Paid Invoices', value: paidCount, sub: 'Paid to date' },
          { label: 'Unpaid Invoices', value: unpaidCount, sub: 'Follow-up required' },
        ];

        setInvoices(enriched);
        setStats(statsData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load accounting data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading accounting data…</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {stats.map((s, i) => <StatCard key={i} label={s.label} value={s.value} sub={s.sub} />)}
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead><tr><th>Invoice #</th><th>Order</th><th>Client</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const startEdit = (u: User) => { setEditEmail(u.email); setEditRole(u.role); setEditStatus(u.status); };
  const saveEdit = () => {
    setUsers(prev => prev.map(u => u.email === editEmail ? { ...u, role: editRole, status: editStatus } : u));
    setEditEmail(null);
    showToast('User updated.');
  };

  useEffect(() => {
    fetch('/data/json/users.json')
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
        {error && <div className="error-state">{error}</div>}
        {!loading && !error && (
          <table className="orders-table">
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

interface ProductionJob {
  id: string;
  client: string;
  product: string;
  qty: number;
  status: string;
  progress: number;
  dueDate: string;
  paper: string;
}

export function ProductionPanel() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const pct = (j: ProductionJob) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;
  const progressColor = (p: number): 'green' | 'orange' | undefined =>
    p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

  useEffect(() => {
    Promise.all([
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([batchesData, ordersData, clientsData]) => {
        const ordersMap = new Map(ordersData.map(o => [o.id, o]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));

        const productionJobs: ProductionJob[] = batchesData
          .filter((b: any) => b.status !== 'completed') // active jobs
          .map((b: any) => {
            const order = ordersMap.get(b.orderId);
            return {
              id: b.id,
              client: order ? clientsMap.get(order.clientId) || 'Unknown' : 'Unknown',
              product: b.product,
              qty: b.qty,
              status: b.status,
              progress: b.progress,
              dueDate: formatDate(b.deadline),
              paper: order?.specs?.paper || b.paper || '—',
            };
          });
        setJobs(productionJobs);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load production data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading jobs…</div>;
  if (error) return <div className="error-state">{error}</div>;

  const active = jobs.filter(j => j.status !== 'completed').length;
  const inProg = jobs.filter(j => j.status === 'in_progress').length;
  const onHold = jobs.filter(j => j.status === 'on_hold').length;
  const completed = jobs.filter(j => j.status === 'completed').length;

  const filtered = jobs.filter(j => {
    const q = query.toLowerCase();
    return !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs" value={active} sub="Currently in queue" />
        <StatCard label="In Progress" value={inProg} sub="Being worked on" />
        <StatCard label="On Hold" value={onHold} sub="Waiting on something" />
        <StatCard label="Completed" value={completed} sub="Finished jobs" />
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
          ))}
      </div>
    </div>
  );
}

// ─── Completed Jobs Panel ─────────────────────────────────────────────────────

export function CompletedJobsPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([batchesData, ordersData, clientsData]) => {
        const ordersMap = new Map(ordersData.map(o => [o.id, o]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));

        const completedBatches = batchesData.filter((b: any) => b.status === 'completed');
        const viewJobs = completedBatches.map((b: any) => {
          const order = ordersMap.get(b.orderId);
          const clientName = order ? clientsMap.get(order.clientId) || 'Unknown' : 'Unknown';
          return {
            id: b.id,
            done: b.progress,
            total: b.qty,
            percent: 100,
            stages: b.stages.map((s: any) => ({
              stage: s.stage,
              status: s.status,
              updated: formatDateTime(s.updatedAt),
            })),
            info: {
              client: clientName,
              batch: b.id,
              product: b.product,
              qty: b.qty,
              completion: formatDate(b.deadline || order?.deliveryDate),
            },
          };
        });
        setJobs(viewJobs);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load completed jobs.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading completed jobs…</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="stack">
      {jobs.map(j => (
        <div key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>Work Progress — {j.id}</h3>
            <p><strong>{j.done} / {j.total}</strong> completed (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
            <table className="orders-table">
              <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
              <tbody>
                {j.stages.map((s: any) => (
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
      {jobs.length === 0 && <p className="muted">No completed jobs.</p>}
    </div>
  );
}
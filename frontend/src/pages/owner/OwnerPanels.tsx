// OwnerPanels.tsx (full refactored version)

import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';
import {
  getOrders,
  getBatches,
  getProductionJobs,
  getClients,
  getSettings,
  getUsers,
  updatePricingRolesSettings,
  updateUser,
  updateProductionJob,
  updateWhatsappSettings,
} from '../../lib/api';
import type { UserProfile } from '../../lib/api';
import { getDashboardStats } from '../../lib/api/dashboardService';
import { getAccountingOverview } from '../../lib/api/invoicesService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getShortOrderId(orderId: string): string {
  const match = orderId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : orderId;
}

function formatAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? '').trim().toUpperCase();
}

function getOrderClientId(order: any): string {
  return String(order.clientId ?? order.customer ?? order.customer_id ?? '');
}

function getClientName(clientsMap: Map<string, string>, clientId: unknown): string {
  return clientsMap.get(String(clientId ?? '')) || 'Unknown';
}

const PENDING_ORDER_STATUSES = new Set(['UNPRICED_PENDING', 'PRICED_PENDING_CONFIRMATION']);
const WORKING_ORDER_STATUSES = new Set(['IN_PROGRESS']);
const COMPLETED_ORDER_STATUSES = new Set(['COMPLETED', 'CLOSED']);
const PRODUCTION_STEP_LABELS: Record<string, string> = {
  pending: 'Ready',
  design: 'Design',
  printing: 'Printing',
  cutting: 'Cutting',
  packaging: 'Packaging',
  ready: 'Ready',
};
const PRODUCTION_STEP_ORDER = ['pending', 'design', 'printing', 'cutting', 'packaging', 'ready'];

export type ManagerOrdersFilter = 'all' | 'pending' | 'working' | 'completed';

// ─── Manager Orders Panel ─────────────────────────────────────────────────────

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

export function ManagerOrdersPanel({ initialFilter = 'all' }: { initialFilter?: ManagerOrdersFilter }) {
  const [view, setView] = useState<PanelView | null>(null);
  const [pending, setPending] = useState<OrderBrief[]>([]);
  const [working, setWorking] = useState<WorkOrder[]>([]);
  const [completed, setCompleted] = useState<CompletedOrder[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [workStages, setWorkStages] = useState<Record<string, WorkStage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ordersRes, productionRes, clientsRes] = await Promise.all([
          getOrders(),
          getProductionJobs(),
          getClients(),
        ]);
        const orders = ordersRes.data.data;
        const productionJobs = productionRes.data.data || [];
        const batches: any[] = [];
        const clients = clientsRes.data.data.results;
        const clientsMap = new Map(clients.map(c => [String(c.id), c.name]));

        const buildBrief = (order: any): OrderBrief => ({
          id: String(order.id),
          displayId: getShortOrderId(String(order.id)),
          client: order.customer_name || getClientName(clientsMap, getOrderClientId(order)),
          status: order.status,
        });

        const pendingOrders = orders
          .filter((o: any) => PENDING_ORDER_STATUSES.has(normalizeStatus(o.status)))
          .map(buildBrief);

        const workingOrders = productionJobs
          .filter((job: any) => normalizeStatus(job.status) !== 'COMPLETED')
          .map((job: any) => {
            const qty = Number(job.quantity || 0);
            const completedQty = Number(job.completed_quantity || 0);
            return {
              id: `job-${job.id}`,
              displayId: `#${job.order_id} / ${job.job_id || `JOB-${job.id}`}`,
              client: job.client_name || 'Unknown',
              status: job.status || 'ready_for_production',
              product: job.product || 'Order Item',
              qty,
              progress: completedQty,
              paper: PRODUCTION_STEP_LABELS[job.current_step] || job.current_step || '-',
            };
          });

        const completedOrders = orders
          .filter((o: any) => COMPLETED_ORDER_STATUSES.has(normalizeStatus(o.status)))
          .map((o: any) => ({
            ...buildBrief(o),
            completedAt: formatDate(o.completed_at || o.updated_at || o.created_at),
          }));

        const details: Record<string, OrderDetail> = {};
        orders.forEach((order: any) => {
          const batch = batches.find((b: any) => String(b.orderId) === String(order.id));
          details[String(order.id)] = {
            product: order.product_summary || order.product || batch?.product || 'Order',
            qty: batch?.qty || order.specs?.qty || order.quantity || 0,
            paper: order.specs?.paper || batch?.paper || '—',
            notes: batch?.notes || order.specs?.description || '—',
          };
        });

        const stagesMap: Record<string, WorkStage[]> = {};
        batches.forEach((batch: any) => {
          if (batch.stages) {
            stagesMap[String(batch.orderId)] = batch.stages.map((s: any) => ({
              stage: s.stage,
              status: s.status,
              updated: formatDateTime(s.updatedAt),
            }));
          }
        });
        productionJobs.forEach((job: any) => {
          const currentStep = job.current_step || 'pending';
          const currentIndex = Math.max(PRODUCTION_STEP_ORDER.indexOf(currentStep), 0);
          stagesMap[`job-${job.id}`] = PRODUCTION_STEP_ORDER.map((step, index) => ({
            stage: PRODUCTION_STEP_LABELS[step] || step,
            status: index < currentIndex ? 'completed' : index === currentIndex ? job.status : 'pending',
            updated: '-',
          }));
        });

        setPending(pendingOrders);
        setWorking(
          workingOrders.map((w: any) => {
            const batch = batches.find((b: any) => String(b.orderId) === String(w.id));
            return {
              ...w,
              product: w.product,
              qty: batch?.qty || w.qty || 0,
              progress: batch?.progress || w.progress || 0,
              paper: w.specs?.paper || batch?.paper || '—',
            };
          })
        );
        setCompleted(completedOrders);
        setOrderDetails(details);
        setWorkStages(stagesMap);
      } catch (err) {
        console.error(err);
        setError('Could not load manager orders data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">Loading orders…</div>;
  if (error) return <div className="error-state">{error}</div>;

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

  const showPending = initialFilter === 'all' || initialFilter === 'pending';
  const showWorking = initialFilter === 'all' || initialFilter === 'working';
  const showCompleted = initialFilter === 'all' || initialFilter === 'completed';

  return (
    <div className="stack">
      <div className="grid-2">
        {showPending && <article className="table-wrap">
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
                    <button
                      className="btn"
                      onClick={() => setView({ kind: 'order', id: o.id, displayId: o.displayId, client: o.client, status: o.status })}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={4}>No pending orders</td></tr>}
            </tbody>
          </table>
        </article>}
        {showWorking && <article className="table-wrap">
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
                    <button
                      className="btn"
                      onClick={() => setView({ kind: 'work-view', id: o.id, displayId: o.displayId, client: o.client, product: o.product, qty: o.qty, progress: o.progress, paper: o.paper })}
                    >
                      Work View
                    </button>
                  </td>
                </tr>
              ))}
              {working.length === 0 && <tr><td colSpan={4}>No working orders</td></tr>}
            </tbody>
          </table>
        </article>}
      </div>
      {showCompleted && <article className="table-wrap">
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
                  <button
                    className="btn"
                    onClick={() => setView({ kind: 'order', id: o.id, displayId: o.displayId, client: o.client, status: o.status })}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {completed.length === 0 && <tr><td colSpan={5}>No completed orders</td></tr>}
          </tbody>
        </table>
      </article>}
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
    (async () => {
      try {
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);
        const batchesData = batchesRes.data.data;
        const ordersData = ordersRes.data.data;
        const clientsData = clientsRes.data.data.results;
        const ordersMap = new Map(ordersData.map(o => [String(o.id), o]));
        const clientsMap = new Map(clientsData.map(c => [String(c.id), c.name]));

        const views: BatchView[] = batchesData.map((b: any) => {
          const orderId = String(b.orderId ?? b.order_id ?? '');
          const order = ordersMap.get(orderId);
          const batchCode = b.code || b.batch_code || b.id;
          return {
            code: String(batchCode),
            order: order ? getShortOrderId(String(order.id)) : orderId,
            client: order ? getClientName(clientsMap, getOrderClientId(order)) : 'Unknown',
            status: b.status,
            date: formatDate(b.created_at || b.updated_at || order?.orderDate || order?.created_at || null),
          };
        });
        setBatches(views);
      } catch (err) {
        console.error(err);
        setError('Could not load batch data.');
      } finally {
        setLoading(false);
      }
    })();
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
            onChange={e => setQuery(e.target.value)}
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
          disabled={filtered.length === 0}
          onClick={() => {
            const header = 'Batch Code,Order,Client,Status,Date';
            const rows = filtered.map(b => [b.code, b.order, b.client, b.status, b.date].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));
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
    (async () => {
      try {
        const overviewRes = await getAccountingOverview();
        const overview = overviewRes.data.data;
        const invoicesData = overview.invoices ?? [];

        const enriched = invoicesData.map((inv: any) => ({
          id: inv.id,
          order: getShortOrderId(String(inv.orderId ?? inv.order_id ?? inv.order ?? '-')),
          client: inv.client_name || 'Unknown',
          total: formatAmount(inv.total ?? inv.total_amount ?? 0),
          status: inv.payment_status || inv.status || 'unpaid',
        }));

        const paidTotal = overview.stats?.revenue_snapshot ?? 0;
        const pendingTotal = overview.stats?.pending_collection ?? 0;
        const paidCount = overview.stats?.paid_orders ?? 0;
        const unpaidCount = overview.stats?.unpaid_orders ?? 0;

        setStats([
          { label: 'Revenue Snapshot', value: `EGP ${(paidTotal / 1000).toFixed(0)}K`, sub: 'Total paid amount' },
          { label: 'Pending Collection', value: `EGP ${(pendingTotal / 1000).toFixed(0)}K`, sub: 'Remaining order amount' },
          { label: 'Paid Orders', value: paidCount, sub: 'Orders fully paid' },
          { label: 'Unpaid Orders', value: unpaidCount, sub: 'Need finance follow-up' },
        ]);
        setInvoices(enriched);
      } catch (err) {
        console.error(err);
        setError('Could not load accounting data.');
      } finally {
        setLoading(false);
      }
    })();
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
          <thead>
            <tr><th>Invoice #</th><th>Order</th><th>Client</th><th>Total</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {invoices.length === 0
              ? <tr><td colSpan={6} className="no-results">No invoices found</td></tr>
              : invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.order}</td>
                  <td>{inv.client}</td>
                  <td>{inv.total}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <button
                      className="btn"
                      onClick={() =>
                        downloadText(`invoice-${inv.id}.txt`, [
                          `INVOICE: ${inv.id}`,
                          `Order:  ${inv.order}`,
                          `Client: ${inv.client}`,
                          `Total:  ${inv.total}`,
                          `Status: ${inv.status}`,
                        ])
                      }
                    >
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

// Maps backend UserProfile → local display row
interface UserRow {
  id: number;
  email: string;
  role: UserProfile['role'];
  status: 'active' | 'inactive';
}

function toUserRow(u: UserProfile): UserRow {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.is_active ? 'active' : 'inactive',
  };
}

export function SettingsPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({
    number: '+20 100 123 4455',
    template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.',
  });

  // Edit state — keyed by numeric user id
  const [editId, setEditId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<UserProfile['role']>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);
  const [savingPricingRoles, setSavingPricingRoles] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const startEdit = (u: UserRow) => {
    setEditId(u.id);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const cancelEdit = () => setEditId(null);

  // Calls PATCH /api/users/<id>/ — updates Supabase via backend
  const saveEdit = async () => {
    if (editId === null) return;
    setSaving(true);
    try {
      await updateUser(editId, {
        role: editRole,
        is_active: editStatus === 'active',
      });
      // Only update local state after server confirms success
      setUsers(prev =>
        prev.map(u =>
          u.id === editId ? { ...u, role: editRole, status: editStatus } : u
        )
      );
      setEditId(null);
      showToast('User updated successfully.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricingRoles = async () => {
    const threshold = Number(pricing.threshold);
    if (!pricing.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast('Enter a valid pricing owner and threshold.');
      return;
    }

    setSavingPricingRoles(true);
    try {
      const res = await updatePricingRolesSettings({
        owner: pricing.owner.trim(),
        approval_threshold: threshold,
      });
      setPricing({
        owner: res.data.data.value.owner,
        threshold: String(res.data.data.value.approval_threshold),
      });
      showToast('Pricing roles saved.');
    } catch (err) {
      console.error('Failed to save pricing roles:', err);
      showToast('Could not save pricing roles.');
    } finally {
      setSavingPricingRoles(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsapp.number.trim() || !whatsapp.template.trim()) {
      showToast('Enter a WhatsApp number and template.');
      return;
    }

    setSavingWhatsapp(true);
    try {
      const res = await updateWhatsappSettings({
        number: whatsapp.number.trim(),
        template: whatsapp.template.trim(),
      });
      setWhatsapp({
        number: String(res.data.data.value.number ?? ''),
        template: String(res.data.data.value.template ?? ''),
      });
      showToast('WhatsApp settings saved.');
    } catch (err) {
      console.error('Failed to save WhatsApp settings:', err);
      showToast('Could not save WhatsApp settings.');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, settingsRes] = await Promise.all([getUsers(), getSettings()]);
        setUsers(usersRes.data.data.map(toUserRow));

        const settings = settingsRes.data.data;
        if (settings.pricing_roles) {
          setPricing({
            owner: settings.pricing_roles.owner ?? 'Senior Manager',
            threshold: String(settings.pricing_roles.approval_threshold ?? 5000),
          });
        }
        if (settings.whatsapp) {
          setWhatsapp({
            number: String(settings.whatsapp.number ?? '+20 100 123 4455'),
            template: String(settings.whatsapp.template ?? 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.'),
          });
        }
      } catch (err) {
        console.error(err);
        setError('Could not load users.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="stack">
      <article className="box">
        <h3>Pricing Roles</h3>
        <div className="form-grid-2">
          <div className="field">
            <label>Pricing Owner</label>
            <input
              className="input"
              type="text"
              value={pricing.owner}
              onChange={e => setPricing(p => ({ ...p, owner: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Approval Threshold (EGP)</label>
            <input
              className="input"
              type="number"
              value={pricing.threshold}
              onChange={e => setPricing(p => ({ ...p, threshold: e.target.value }))}
            />
          </div>
        </div>
        <button
          className="btn primary"
          style={{ marginTop: 12 }}
          onClick={handleSavePricingRoles}
          disabled={savingPricingRoles}
        >
          {savingPricingRoles ? 'Saving...' : 'Save Pricing Roles'}
        </button>
      </article>

      <article className="box">
        <h3>Notification Format (WhatsApp)</h3>
        <div className="field">
          <label>WhatsApp Business Number</label>
          <input
            className="input"
            type="text"
            value={whatsapp.number}
            onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Message Template</label>
          <textarea
            className="textarea"
            value={whatsapp.template}
            onChange={e => setWhatsapp(w => ({ ...w, template: e.target.value }))}
          />
        </div>
        <button
          className="btn primary"
          style={{ marginTop: 12 }}
          onClick={handleSaveWhatsapp}
          disabled={savingWhatsapp}
        >
          {savingWhatsapp ? 'Saving...' : 'Save WhatsApp Settings'}
        </button>
      </article>

      <article className="box">
        <h3>User Management</h3>
        {loading && <div className="loading-state">Loading users…</div>}
        {error && <div className="error-state">{error}</div>}
        {!loading && !error && (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u =>
                editId === u.id ? (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as UserProfile['role'])}
                      >
                        <option value="owner">Owner</option>
                        <option value="staff">Staff</option>
                        <option value="client">Client</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as 'active' | 'inactive')}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn primary"
                        onClick={saveEdit}
                        disabled={saving}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="btn"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      <button className="btn" onClick={() => startEdit(u)}>Edit</button>
                    </td>
                  </tr>
                )
              )}
              {users.length === 0 && (
                <tr><td colSpan={4}>No users found.</td></tr>
              )}
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
  itemId: number;
  orderId: number;
  client: string;
  product: string;
  qty: number;
  completedQty: number;
  status: string;
  progress: number;
  dueDate: string;
  paper: string;
  currentStep?: string;
}

export function ProductionPanel() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [productionStats, setProductionStats] = useState({
    active: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const pct = (j: ProductionJob) => j.qty > 0 ? Math.round((j.progress / j.qty) * 100) : 0;
  const progressColor = (p: number): 'green' | 'orange' | undefined =>
    p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, dashboardRes] = await Promise.all([
          getProductionJobs(),
          getDashboardStats(),
        ]);
        const dashboard = dashboardRes.data.data;

        const productionJobs: ProductionJob[] = (jobsRes.data.data || [])
          .map((job: any) => {
            const order: any = { specs: {} };
            const b: any = { paper: '-' };
            return {
              id: String(job.job_id || `JOB-${job.id}`),
              itemId: Number(job.id),
              orderId: Number(job.order_id),
              client: job.client_name || 'Unknown',
              product: job.product || 'Order Item',
              qty: Number(job.quantity || 0),
              completedQty: Number(job.completed_quantity || 0),
              status: job.status || 'ready_for_production',
              progress: Number(job.completed_quantity || 0),
              dueDate: formatDate(job.due_date),
              paper: order?.specs?.paper || b.paper || '—',
            };
          });
        setJobs(productionJobs);
        setProductionStats({
          active: dashboard.production?.total_items ?? 0,
          inProgress: dashboard.production?.items_in_printing ?? 0,
          onHold: 0,
          completed: dashboard.production?.items_ready ?? 0,
        });
      } catch (err) {
        console.error(err);
        setError('Could not load production data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">Loading jobs…</div>;
  if (error) return <div className="error-state">{error}</div>;

  const filtered = jobs.filter(j => {
    const q = query.toLowerCase();
    return !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs" value={productionStats.active} sub="Order items in production" />
        <StatCard label="In Progress" value={productionStats.inProgress} sub="Items in printing" />
        <StatCard label="On Hold" value={productionStats.onHold} sub="No backend hold source yet" />
        <StatCard label="Completed" value={productionStats.completed} sub="Items ready" />
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
          ? <p className="muted">No production jobs found.</p>
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
    (async () => {
      try {
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);
        const batchesData = batchesRes.data.data;
        const ordersData = ordersRes.data.data;
        const clientsData = clientsRes.data.data.results;
        const ordersMap = new Map(ordersData.map(o => [String(o.id), o]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c.name]));

        const completedBatches = batchesData.filter((b: any) => b.status === 'completed');
        const viewJobs = completedBatches.map((b: any) => {
          const order = ordersMap.get(String(b.orderId));
          const clientName = order ? clientsMap.get(order.clientId ?? String(order.customer ?? '')) || 'Unknown' : 'Unknown';
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
      } catch (err) {
        console.error(err);
        setError('Could not load completed jobs.');
      } finally {
        setLoading(false);
      }
    })();
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
              <thead>
                <tr><th>Stage</th><th>Status</th><th>Updated At</th></tr>
              </thead>
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

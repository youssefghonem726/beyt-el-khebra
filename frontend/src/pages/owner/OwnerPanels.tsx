// OwnerPanels.tsx (full refactored version)

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common', 'managerOrders']);
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
        setError(t('managerOrders:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">{t('managerOrders:loading')}</div>;
  if (error) return <div className="error-state">{error}</div>;

  if (view?.kind === 'order') {
    const detail = orderDetails[view.id];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>
          {t('managerOrders:back')}
        </button>
        <div className="box">
          <h3 style={{ marginBottom: 12 }}>{t('managerOrders:detail.title', { displayId: view.displayId })}</h3>
          <div className="form-grid-2" style={{ fontSize: 14 }}>
            <p><strong>{t('managerOrders:detail.client')}:</strong> {view.client}</p>
            <p><strong>{t('managerOrders:detail.status')}:</strong> <StatusBadge status={view.status} /></p>
            {detail && (
              <>
                <p><strong>{t('managerOrders:detail.product')}:</strong> {detail.product}</p>
                <p><strong>{t('managerOrders:detail.qty')}:</strong> {detail.qty} {t('managerOrders:detail.pcs')}</p>
                <p><strong>{t('managerOrders:detail.paper')}:</strong> {detail.paper}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>{t('managerOrders:detail.notes')}:</strong> {detail.notes}</p>
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
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView(null)}>
          {t('managerOrders:back')}
        </button>
        <div className="box">
          <h3 style={{ marginBottom: 4 }}>{t('managerOrders:workView.title', { displayId: view.displayId })}</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{view.client} · {view.product}</p>
          <ProgressBar percent={pct} color={pct === 100 ? 'green' : pct >= 50 ? 'orange' : undefined} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
            {view.progress} / {view.qty} {t('managerOrders:workView.printed')} ({pct}%)
          </p>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:workView.stage')}</th>
                <th>{t('managerOrders:workView.statusCol')}</th>
                <th>{t('managerOrders:workView.updatedAt')}</th>
              </tr>
            </thead>
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
          <div className="table-head"><h3>{t('managerOrders:pending.title')}</h3></div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:table.order')}</th>
                <th>{t('managerOrders:table.status')}</th>
                <th>{t('managerOrders:table.client')}</th>
                <th>{t('managerOrders:table.action')}</th>
              </tr>
            </thead>
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
                      {t('managerOrders:table.view')}
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={4}>{t('managerOrders:pending.empty')}</td></tr>}
            </tbody>
          </table>
        </article>}
        {showWorking && <article className="table-wrap">
          <div className="table-head"><h3>{t('managerOrders:working.title')}</h3></div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:table.order')}</th>
                <th>{t('managerOrders:table.status')}</th>
                <th>{t('managerOrders:table.client')}</th>
                <th>{t('managerOrders:table.action')}</th>
              </tr>
            </thead>
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
                      {t('managerOrders:working.workView')}
                    </button>
                  </td>
                </tr>
              ))}
              {working.length === 0 && <tr><td colSpan={4}>{t('managerOrders:working.empty')}</td></tr>}
            </tbody>
          </table>
        </article>}
      </div>
      {showCompleted && <article className="table-wrap">
        <div className="table-head"><h3>{t('managerOrders:completed.title')}</h3></div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('managerOrders:table.order')}</th>
              <th>{t('managerOrders:table.status')}</th>
              <th>{t('managerOrders:table.client')}</th>
              <th>{t('managerOrders:completed.completedAt')}</th>
              <th>{t('managerOrders:table.action')}</th>
            </tr>
          </thead>
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
                    {t('managerOrders:table.view')}
                  </button>
                </td>
              </tr>
            ))}
            {completed.length === 0 && <tr><td colSpan={5}>{t('managerOrders:completed.empty')}</td></tr>}
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
  const { t } = useTranslation(['common', 'batchLookup']);
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
        setError(t('batchLookup:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">{t('batchLookup:loading')}</div>;
  if (error) return <div className="error-state">{error}</div>;

  const filtered = batches.filter(b => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  if (selected) {
    return (
      <div>
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>
          {t('batchLookup:back')}
        </button>
        <div className="box">
          <h3 style={{ marginBottom: 12 }}>{t('batchLookup:modal.title', { code: selected.code })}</h3>
          <div className="form-grid-2" style={{ fontSize: 14 }}>
            <p><strong>{t('batchLookup:table.order')}:</strong> {selected.order}</p>
            <p><strong>{t('batchLookup:modal.client')}:</strong> {selected.client}</p>
            <p><strong>{t('batchLookup:table.date')}:</strong> {selected.date}</p>
            <p><strong>{t('batchLookup:table.status')}:</strong> <StatusBadge status={selected.status} /></p>
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
            placeholder={t('batchLookup:searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
          {dropdownOpen && (
            <div className="filter-dropdown show">
              <div className="field">
                <label>{t('batchLookup:table.status')}</label>
                <select className="select">
                  <option value="">{t('batchLookup:filter.all')}</option>
                  <option>{t('batchLookup:filter.active')}</option>
                  <option>{t('batchLookup:filter.completed')}</option>
                </select>
              </div>
              <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                {t('batchLookup:filter.apply')}
              </button>
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
          {t('batchLookup:export')}
        </button>
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('batchLookup:table.batchCode')}</th>
              <th>{t('batchLookup:table.order')}</th>
              <th>{t('batchLookup:table.clientName')}</th>
              <th>{t('batchLookup:table.status')}</th>
              <th>{t('batchLookup:table.date')}</th>
              <th>{t('batchLookup:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="no-results">{t('batchLookup:noResults')}</td></tr>
              : filtered.map(b => (
                <tr key={b.code}>
                  <td>{b.code}</td>
                  <td>{b.order}</td>
                  <td>{b.client}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.date}</td>
                  <td><button className="btn" onClick={() => setSelected(b)}>{t('batchLookup:table.view')}</button></td>
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
  const { t } = useTranslation(['common', 'accounting']);
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
          { label: t('accounting:stats.revenueSnapshot'), value: `EGP ${(paidTotal / 1000).toFixed(0)}K`, sub: t('accounting:stats.revenueSnapshotSub') },
          { label: t('accounting:stats.pendingCollection'), value: `EGP ${(pendingTotal / 1000).toFixed(0)}K`, sub: t('accounting:stats.pendingCollectionSub') },
          { label: t('accounting:stats.paidOrders'), value: paidCount, sub: t('accounting:stats.paidOrdersSub') },
          { label: t('accounting:stats.unpaidOrders'), value: unpaidCount, sub: t('accounting:stats.unpaidOrdersSub') },
        ]);
        setInvoices(enriched);
      } catch (err) {
        console.error(err);
        setError(t('accounting:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">{t('accounting:loading')}</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {stats.map((s, i) => <StatCard key={i} label={s.label} value={s.value} sub={s.sub} />)}
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('accounting:invoices.colInvoice')}</th>
              <th>{t('accounting:invoices.colOrder')}</th>
              <th>{t('accounting:invoices.colClient')}</th>
              <th>{t('accounting:invoices.colTotal')}</th>
              <th>{t('accounting:invoices.colStatus')}</th>
              <th>{t('accounting:invoices.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0
              ? <tr><td colSpan={6} className="no-results">{t('accounting:invoices.empty')}</td></tr>
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
                      {t('accounting:invoices.downloadBtn')}
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
  const { t } = useTranslation(['common', 'ownerSettings']);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({
    number: '+20 100 123 4455',
    template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.',
  });

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

  const saveEdit = async () => {
    if (editId === null) return;
    setSaving(true);
    try {
      await updateUser(editId, {
        role: editRole,
        is_active: editStatus === 'active',
      });
      setUsers(prev =>
        prev.map(u =>
          u.id === editId ? { ...u, role: editRole, status: editStatus } : u
        )
      );
      setEditId(null);
      showToast(t('ownerSettings:users.toastSaved'));
    } catch (err) {
      console.error(err);
      showToast(t('ownerSettings:users.toastError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricingRoles = async () => {
    const threshold = Number(pricing.threshold);
    if (!pricing.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast(t('ownerSettings:pricingRoles.toastInvalid'));
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
      showToast(t('ownerSettings:pricingRoles.toastSaved'));
    } catch (err) {
      console.error('Failed to save pricing roles:', err);
      showToast(t('ownerSettings:pricingRoles.toastError'));
    } finally {
      setSavingPricingRoles(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsapp.number.trim() || !whatsapp.template.trim()) {
      showToast(t('ownerSettings:whatsapp.toastInvalid'));
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
      showToast(t('ownerSettings:whatsapp.toastSaved'));
    } catch (err) {
      console.error('Failed to save WhatsApp settings:', err);
      showToast(t('ownerSettings:whatsapp.toastError'));
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
        setError(t('ownerSettings:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="stack">
      <article className="box">
        <h3>{t('ownerSettings:pricingRoles.title')}</h3>
        <div className="form-grid-2">
          <div className="field">
            <label>{t('ownerSettings:pricingRoles.owner')}</label>
            <input
              className="input"
              type="text"
              value={pricing.owner}
              onChange={e => setPricing(p => ({ ...p, owner: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>{t('ownerSettings:pricingRoles.threshold')}</label>
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
          {savingPricingRoles ? t('ownerSettings:pricingRoles.saving') : t('ownerSettings:pricingRoles.save')}
        </button>
      </article>

      <article className="box">
        <h3>{t('ownerSettings:whatsapp.title')}</h3>
        <div className="field">
          <label>{t('ownerSettings:whatsapp.number')}</label>
          <input
            className="input"
            type="text"
            value={whatsapp.number}
            onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>{t('ownerSettings:whatsapp.template')}</label>
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
          {savingWhatsapp ? t('ownerSettings:whatsapp.saving') : t('ownerSettings:whatsapp.save')}
        </button>
      </article>

      <article className="box">
        <h3>{t('ownerSettings:users.title')}</h3>
        {loading && <div className="loading-state">{t('ownerSettings:loading')}</div>}
        {error && <div className="error-state">{error}</div>}
        {!loading && !error && (
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('ownerSettings:users.colEmail')}</th>
                <th>{t('ownerSettings:users.colRole')}</th>
                <th>{t('ownerSettings:users.colStatus')}</th>
                <th>{t('ownerSettings:users.colAction')}</th>
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
                        <option value="owner">{t('ownerSettings:users.roleOwner')}</option>
                        <option value="staff">{t('ownerSettings:users.roleStaff')}</option>
                        <option value="client">{t('ownerSettings:users.roleClient')}</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as 'active' | 'inactive')}
                      >
                        <option value="active">{t('ownerSettings:users.statusActive')}</option>
                        <option value="inactive">{t('ownerSettings:users.statusInactive')}</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn primary" onClick={saveEdit} disabled={saving}>
                        {saving ? t('ownerSettings:users.saving') : t('ownerSettings:users.save')}
                      </button>
                      <button className="btn" onClick={cancelEdit} disabled={saving}>
                        {t('ownerSettings:users.cancel')}
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      <button className="btn" onClick={() => startEdit(u)}>
                        {t('ownerSettings:users.edit')}
                      </button>
                    </td>
                  </tr>
                )
              )}
              {users.length === 0 && (
                <tr><td colSpan={4}>{t('ownerSettings:users.noUsers')}</td></tr>
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
  const { t } = useTranslation(['common', 'production']);
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
        setError(t('production:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">{t('production:loading')}</div>;
  if (error) return <div className="error-state">{error}</div>;

  const filtered = jobs.filter(j => {
    const q = query.toLowerCase();
    return !q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.product.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('production:stats.activeJobs')} value={productionStats.active} sub={t('production:stats.activeSub')} />
        <StatCard label={t('production:stats.inProgress')} value={productionStats.inProgress} sub={t('production:stats.inProgressSub')} />
        <StatCard label={t('production:stats.onHold')} value={productionStats.onHold} sub={t('production:stats.onHoldSub')} />
        <StatCard label={t('production:stats.completed')} value={productionStats.completed} sub={t('production:stats.completedSub')} />
      </div>
      <input
        className="input"
        type="search"
        placeholder={t('production:table.searchPlaceholder')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="job-cards">
        {filtered.length === 0
          ? <p className="muted">{t('production:table.empty')}</p>
          : filtered.map(j => (
            <article key={j.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <h4>{j.id}</h4>
                <StatusBadge status={j.status} />
              </div>
              <p>
                <strong>{t('production:card.client')}:</strong> {j.client} |{' '}
                <strong>{t('production:card.product')}:</strong> {j.product} — {j.qty} {t('production:card.pcsUnit')}
              </p>
              <p style={{ marginBottom: 6 }}><strong>{t('production:card.due')}:</strong> {j.dueDate}</p>
              <ProgressBar percent={pct(j)} color={progressColor(pct(j))} />
              <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                {j.progress} / {j.qty} {t('production:card.printed')} ({pct(j)}%)
              </p>
            </article>
          ))}
      </div>
    </div>
  );
}

// ─── Completed Jobs Panel ─────────────────────────────────────────────────────

export function CompletedJobsPanel() {
  const { t } = useTranslation(['common', 'completedJobs']);
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
        setError(t('completedJobs:error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-state">{t('completedJobs:loading')}</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="stack">
      {jobs.map(j => (
        <div key={j.id} className="split" style={{ marginBottom: 14 }}>
          <article className="box">
            <h3>{t('completedJobs:progress.title', { id: j.id })}</h3>
            <p><strong>{j.done} / {j.total}</strong> {t('completedJobs:progress.completed')} (100%)</p>
            <ProgressBar percent={100} style={{ margin: '8px 0 14px' }} />
            <table className="orders-table">
              <thead>
                <tr>
                  <th>{t('completedJobs:progress.table.stage')}</th>
                  <th>{t('completedJobs:progress.table.status')}</th>
                  <th>{t('completedJobs:progress.table.updatedAt')}</th>
                </tr>
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
            <h3>{t('completedJobs:info.title')}</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('completedJobs:info.client')}:</strong> {j.info.client}</li>
              <li><strong>{t('completedJobs:info.batch')}:</strong> {j.info.batch}</li>
              <li><strong>{t('completedJobs:info.product')}:</strong> {j.info.product}</li>
              <li><strong>{t('completedJobs:info.quantity')}:</strong> {j.info.qty}</li>
              <li><strong>{t('completedJobs:info.completionDate')}:</strong> {j.info.completion}</li>
            </ul>
          </aside>
        </div>
      ))}
      {jobs.length === 0 && <p className="muted">{t('completedJobs:empty')}</p>}
    </div>
  );
}

import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders, updateOrder } from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import { getDeliveries, type DeliveryResponse } from '../../lib/api/deliveriesService';
import type { Order } from '../../lib/api/types';

// Status list – kept from your branch, with CONFIRMED added (already present in API)
const STATUS_FILTER_VALUES = [
  'UNPRICED_PENDING',
  'PRICED_PENDING_CONFIRMATION',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const;

// ─── Types ────────────────────────────────────────────────────────────
interface BackendBatch {
  id: number;
  orderId: number;
  batchCode?: string;
  batch_code?: string;
  progress: number;
  status: string;
  deadline?: string | null;
}

interface DisplayOrder {
  id: string;
  shortId: string;
  batch: string;
  product: string;
  status: string;
  delivery: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
  date: string;
  total: string;
  payment: string;
  paid: string;
  canCancel: boolean;
}

// ─── Helper functions ────────────────────────────────────────────────
function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number | string | null, lang: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `EGP ${value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getProductName(order: Order): string {
  if (order.product_summary) return order.product_summary;
  if (Array.isArray(order.item_details) && order.item_details.length > 0) {
    return order.item_details
      .map((item) => `${item.item_type || 'Order Item'} (${item.quantity || 1} pcs)`)
      .join(', ');
  }
  return `Order #${order.id}`;
}

function isCancellable(status: string): boolean {
  return ['UNPRICED_PENDING', 'PRICED_PENDING_CONFIRMATION'].includes(status);
}

function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'CANCELED') return 'red';
  if (progress >= 100) return 'green';
  return 'orange';
}

// ─── Component ────────────────────────────────────────────────────────
export default function MyOrders() {
  return (
    <Suspense fallback={null}>
      <MyOrdersInner />
    </Suspense>
  );
}

function MyOrdersInner() {
  const { t, i18n } = useTranslation(['common', 'myOrders']);
  const { navigateTopLevel } = useNavigation();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, batchesRes, deliveriesRes] = await Promise.all([
        getOrders(),
        getBatches().catch(() => ({ data: { data: [] } })),
        getDeliveries().catch(() => ({ data: { data: [] } })),
      ]);

      const backendOrders: Order[] = ordersRes.data.data;
      const batches: BackendBatch[] = batchesRes.data.data || [];
      const deliveries: DeliveryResponse[] = deliveriesRes.data.data || [];
      const batchMap = new Map(batches.map((b) => [Number(b.orderId), b]));
      const deliveryMap = new Map(deliveries.map((d) => [Number(d.orderId), d]));

      const mapped: DisplayOrder[] = backendOrders.map((order) => {
        const batch = batchMap.get(order.id);
        const delivery = order.delivery_info || deliveryMap.get(order.id);
        const productionProgress = Number(order.production_progress ?? batch?.progress ?? 0);
        const progress = delivery ? Number(delivery.progress || 0) : productionProgress;
        const batchCode =
          order.batch_code ||
          batch?.batchCode ||
          batch?.batch_code ||
          (batch ? `BATCH-${String(batch.id).padStart(4, '0')}` : '—');

        return {
          id: String(order.id),
          shortId: `#${order.id}`,
          batch: batchCode,
          product: getProductName(order),
          status: order.status,
          delivery: delivery ? delivery.status : '—',
          progress: order.status === 'CANCELED' ? 0 : progress,
          color: getProgressColor(order.status === 'CANCELED' ? 0 : progress, order.status),
          date: formatDate(order.created_at || null, i18n.language),
          total: formatAmount(order.total_price ?? null, i18n.language),
          payment: order.payment_method || '—',
          paid: formatAmount(order.paid_amount ?? null, i18n.language),
          canCancel: isCancellable(order.status),
        };
      });

      setOrders(mapped);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(t('myOrders:error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async (order: DisplayOrder) => {
    if (!order.canCancel) return;
    const confirmed = window.confirm(
      t('myOrders:cancelConfirm', { id: order.shortId })
    );
    if (!confirmed) return;

    setCancellingId(order.id);
    try {
      await updateOrder(order.id, { status: 'CANCELED' });
      await fetchData(); // refresh list after cancel
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(t('myOrders:cancelError'));
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = orders.filter((order) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      order.id.toLowerCase().includes(q) ||
      order.shortId.toLowerCase().includes(q) ||
      order.batch.toLowerCase().includes(q) ||
      order.product.toLowerCase().includes(q);
    const matchS = !filterStatus || order.status === filterStatus;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title={t('myOrders:title')} />
        <div className="loading-state">{t('myOrders:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title={t('myOrders:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head">
          <h3>{t('myOrders:allOrders')}</h3>
          <div className="actions-inline">
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder={t('myOrders:searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="filter-icon"
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                ▼
              </button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>{t('common:filter.status')}</label>
                    <select
                      className="select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">{t('common:filter.allStatus')}</option>
                      {STATUS_FILTER_VALUES.map((v) => (
                        <option key={v} value={v}>
                          {t(`common:status.${v}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {t('common:filter.apply')}
                  </button>
                </div>
              )}
            </div>
            <button
              className="btn primary"
              onClick={() => navigateTopLevel('place-new-order')}
            >
              {t('myOrders:newOrder')}
            </button>
          </div>
        </div>

        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('myOrders:table.order')}</th>
              <th>{t('myOrders:table.batchCode')}</th>
              <th>{t('myOrders:table.product')}</th>
              <th>{t('myOrders:table.status')}</th>
              <th>{t('myOrders:table.deliveryProgress')}</th>
              <th>{t('myOrders:table.date')}</th>
              <th>{t('myOrders:table.total')}</th>
              <th>{t('myOrders:table.paymentMethod')}</th>
              <th>{t('myOrders:table.paidAmount')}</th>
              <th>{t('myOrders:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="no-results">
                  {t('myOrders:noResults')}
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id}>
                  <td>{order.shortId}</td>
                  <td>{order.batch}</td>
                  <td>{order.product}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    {order.delivery !== '—' ? (
                      <StatusBadge status={order.delivery} />
                    ) : (
                      <span className="muted">{t('myOrders:noDelivery')}</span>
                    )}
                    <ProgressBar
                      percent={order.progress}
                      color={order.color}
                      style={{ marginTop: 6 }}
                    />
                  </td>
                  <td>{order.date}</td>
                  <td>{order.total}</td>
                  <td>{order.payment}</td>
                  <td>{order.paid}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn"
                        onClick={() =>
                          navigateTopLevel(`/client/orders/${order.id}`)
                        }
                      >
                        {t('myOrders:table.view')}
                      </button>
                      {order.canCancel && (
                        <button
                          className="btn"
                          onClick={() => handleCancel(order)}
                          disabled={cancellingId === order.id}
                        >
                          {cancellingId === order.id
                            ? t('myOrders:cancelling')
                            : t('myOrders:cancel')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
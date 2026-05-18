import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import { getDeliveries } from '../../lib/api/deliveriesService';

const STATUS_FILTER_VALUES = [
  'UNPRICED_PENDING',
  'PRICED_PENDING_CONFIRMATION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const;

interface BackendOrder {
  id: number;
  status: string;
  total_price?: number | null;
  paid_amount?: number | null;
  payment_method?: string | null;
  created_at?: string;
  due_date?: string | null;
  upload?: { file_name?: string };
}

interface BackendBatch {
  id: number;
  orderId: number;
  progress: number;
  status: string;
  deadline?: string | null;
}

interface BackendDelivery {
  id: number;
  orderId: number;
  status: string;
  progress: number;
  scheduledDate: string;
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
}

function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount: number | null, lang: string): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'CANCELED') return 'red';
  if (progress >= 100) return 'green';
  return 'orange';
}

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, batchesRes, deliveriesRes] = await Promise.all([
          getOrders(),
          getBatches(),
          getDeliveries(),
        ]);

        const backendOrders: BackendOrder[] = ordersRes.data.data;
        const batches: BackendBatch[] = batchesRes.data.data;
        const deliveries: BackendDelivery[] = deliveriesRes.data.data;

        const batchMap = new Map(batches.map((b) => [b.orderId, b]));
        const deliveryMap = new Map(deliveries.map((d) => [d.orderId, d]));

        const displayOrders: DisplayOrder[] = backendOrders.map((o) => {
          const batch = batchMap.get(o.id);
          const delivery = deliveryMap.get(o.id);

          let progress = batch ? batch.progress : 0;
          if (o.status === 'COMPLETED') progress = 100;
          if (o.status === 'CANCELED') progress = 0;

          let deliveryStatus = delivery ? delivery.status : '—';
          if (!delivery) {
            if (o.status === 'COMPLETED') deliveryStatus = 'delivered';
            else if (o.status === 'CANCELED') deliveryStatus = 'canceled';
          }

          return {
            id: String(o.id),
            shortId: `#${o.id}`,
            batch: batch ? `BATCH-${batch.id}` : '—',
            product: o.upload?.file_name || `Order #${o.id}`,
            status: o.status,
            delivery: deliveryStatus,
            progress,
            color: getProgressColor(progress, o.status),
            date: formatDate(o.created_at || null, i18n.language),
            total: formatAmount(o.total_price ?? null, i18n.language),
            payment: o.payment_method || '—',
            paid: formatAmount(o.paid_amount ?? null, i18n.language),
          };
        });

        setOrders(displayOrders);
      } catch (err) {
        console.error('Failed to load orders:', err);
        setError(t('myOrders:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = orders.filter((o) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.shortId.toLowerCase().includes(q) ||
      o.batch.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q);
    const matchS = !filterStatus || o.status.toLowerCase().includes(filterStatus.toLowerCase());
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

  if (error) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title={t('myOrders:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title={t('myOrders:title')} />
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
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
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
                        <option key={v} value={v}>{t(`common:status.${v}`)}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                    {t('common:filter.apply')}
                  </button>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>
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
              filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.shortId}</td>
                  <td>{o.batch}</td>
                  <td>{o.product}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <StatusBadge status={o.delivery} />
                    <ProgressBar percent={o.progress} color={o.color} style={{ marginTop: 6 }} />
                  </td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                  <td>{o.payment}</td>
                  <td>{o.paid}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>
                      {t('myOrders:table.view')}
                    </button>
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

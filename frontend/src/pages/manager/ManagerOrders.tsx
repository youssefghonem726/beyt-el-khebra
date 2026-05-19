import { useEffect, useMemo, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders } from '../../lib/api/ordersQuotesService';
import type { Order } from '../../lib/api/types';

interface Props {
  role?: 'manager' | 'owner';
}

type FilterMode = 'active' | 'completed' | 'archive';

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(value?: string | null, lang: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function clientName(order: Order): string {
  return (
    order.customer_name ||
    order.customer_email ||
    `Client #${order.customer}`
  );
}

function progress(order: Order): number {
  if (typeof order.production_progress === 'number')
    return order.production_progress;
  if (order.status === 'COMPLETED') return 100;
  if (order.status === 'IN_PROGRESS') return 50;
  return 0;
}

// ─── Component ────────────────────────────────────────────────────
export default function ManagerOrders({ role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <ManagerOrdersInner role={role} />
    </Suspense>
  );
}

function ManagerOrdersInner({ role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'managerOrders']);
  const { navigateTopLevel } = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<FilterMode>('active');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrders()
      .then((res) => setOrders(res.data.data))
      .catch((err) => {
        console.error('Failed to load manager orders:', err);
        setError(t('managerOrders:error'));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const inMode =
        mode === 'active'
          ? ['CONFIRMED', 'IN_PROGRESS'].includes(order.status)
          : mode === 'completed'
            ? order.status === 'COMPLETED'
            : ['CANCELED', 'CLOSED'].includes(order.status);

      const matchesQuery =
        !q ||
        String(order.id).includes(q) ||
        clientName(order).toLowerCase().includes(q) ||
        (order.product_summary || '').toLowerCase().includes(q);

      return inMode && matchesQuery;
    });
  }, [orders, mode, query]);

  const lang = i18n.language;
  const activePage = role === 'owner' ? 'owner-dashboard' : 'manager-orders';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('managerOrders:title')} />
        <div className="loading-state">{t('managerOrders:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={t('managerOrders:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="actions-inline" style={{ flexWrap: 'wrap' }}>
            <button
              className={`btn${mode === 'active' ? ' primary' : ''}`}
              onClick={() => setMode('active')}
            >
              {t('managerOrders:filter.active')}
            </button>
            <button
              className={`btn${mode === 'completed' ? ' primary' : ''}`}
              onClick={() => setMode('completed')}
            >
              {t('managerOrders:filter.completed')}
            </button>
            <button
              className={`btn${mode === 'archive' ? ' primary' : ''}`}
              onClick={() => setMode('archive')}
            >
              {t('managerOrders:filter.archive')}
            </button>
          </div>
          <input
            className="input"
            type="search"
            placeholder={t('managerOrders:searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:table.order')}</th>
                <th>{t('managerOrders:table.client')}</th>
                <th>{t('managerOrders:table.product')}</th>
                <th>{t('managerOrders:table.status')}</th>
                <th>{t('managerOrders:table.production')}</th>
                <th>{t('managerOrders:table.dueDate')}</th>
                <th>{t('managerOrders:table.batch')}</th>
                <th>{t('managerOrders:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-results">
                    {t('managerOrders:noResults')}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const pct = progress(order);
                  return (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{clientName(order)}</td>
                      <td>
                        {order.product_summary ||
                          t('managerOrders:productFallback', { id: order.id })}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td style={{ minWidth: 150 }}>
                        <ProgressBar
                          percent={pct}
                          color={
                            pct === 100
                              ? 'green'
                              : pct >= 50
                                ? 'orange'
                                : undefined
                          }
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {pct}%
                        </span>
                      </td>
                      <td>{formatDate(order.due_date, lang)}</td>
                      <td>
                        {(order as any).batch_code ||
                          t('managerOrders:batchFallback')}
                      </td>
                      <td>
                        <div className="actions-inline" style={{ flexWrap: 'wrap', gap: 6 }}>
                          <button
                            className="btn"
                            onClick={() =>
                              navigateTopLevel(`/manager/orders/${order.id}`)
                            }
                          >
                            {t('managerOrders:actions.view')}
                          </button>
                          {['CONFIRMED', 'IN_PROGRESS'].includes(
                            order.status
                          ) && (
                            <button
                              className="btn primary"
                              onClick={() =>
                                navigateTopLevel('/manager/work-view')
                              }
                            >
                              {t('managerOrders:actions.workView')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
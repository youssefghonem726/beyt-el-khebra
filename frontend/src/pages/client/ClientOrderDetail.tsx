import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrderById } from '../../lib/api/ordersQuotesService';
import type { Order } from '../../lib/api/types';

// ─── Helpers ────────────────────────────────────────────────────────────

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

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// Timeline builder – returns objects with translatable label keys
function timelineFor(order: Order) {
  const status = order.status;
  const placed = Boolean(order.created_at);
  return [
    {
      labelKey: 'clientOrderDetail:timeline.orderPlaced',
      date: formatDate(order.created_at, 'en'), // default language; will be replaced later
      done: placed,
      current: status === 'UNPRICED_PENDING',
    },
    {
      labelKey: 'clientOrderDetail:timeline.awaitingPricing',
      date: '',
      done: status !== 'UNPRICED_PENDING' && status !== 'CANCELLED',
      current: status === 'UNPRICED_PENDING',
    },
    {
      labelKey: 'clientOrderDetail:timeline.quoteReady',
      date: '',
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status),
      current: status === 'PRICED_PENDING_CONFIRMATION',
    },
    {
      labelKey: 'clientOrderDetail:timeline.confirmed',
      date: '',
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status),
      current: status === 'CONFIRMED',
    },
    {
      labelKey: 'clientOrderDetail:timeline.inProduction',
      date: '',
      done: ['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status),
      current: status === 'IN_PROGRESS',
    },
    {
      labelKey: 'clientOrderDetail:timeline.completed',
      date: order.completed_at ? formatDate(order.completed_at, 'en') : '',
      done: ['COMPLETED', 'CLOSED'].includes(status),
      current: status === 'COMPLETED',
    },
    ...(status === 'CANCELLED'
      ? [
          {
            labelKey: 'clientOrderDetail:timeline.cancelled',
            date: '',
            done: true,
            current: true,
          },
        ]
      : []),
    ...(order.delivery_info
      ? [
          {
            labelKey: 'clientOrderDetail:timeline.delivery',
            labelParams: { status: order.delivery_info.status.replace(/_/g, ' ') },
            date: formatDate(order.delivery_info.deliveredAt || order.delivery_info.scheduledDate || null, 'en'),
            done: order.delivery_info.status === 'delivered',
            current: order.delivery_info.status !== 'delivered',
          },
        ]
      : []),
  ];
}

// ─── Component ──────────────────────────────────────────────────────────

export default function ClientOrderDetail() {
  return (
    <Suspense fallback={null}>
      <ClientOrderDetailInner />
    </Suspense>
  );
}

function ClientOrderDetailInner() {
  const { t, i18n } = useTranslation(['common', 'clientOrderDetail']);
  const { id: routeOrderId } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeOrderId) {
      setError(t('clientOrderDetail:errors.noId'));
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await getOrderById(routeOrderId);
        setOrder(res.data.data);
      } catch (err) {
        console.error('Failed to load order details:', err);
        setError(t('clientOrderDetail:errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [routeOrderId]);

  if (loading) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title={t('clientOrderDetail:pageTitle')} />
        <div className="loading-state">{t('clientOrderDetail:loading')}</div>
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title={t('clientOrderDetail:pageTitle')} />
        <section className="table-wrap">
          <div className="error-state">{error || t('clientOrderDetail:errors.notFound')}</div>
        </section>
      </AppShell>
    );
  }

  const progress = order.status === 'CANCELLED' ? 0 : Number(order.production_progress ?? 0);
  const productName = getProductName(order);
  const delivery = order.delivery_info;
  const timeline = timelineFor(order).map((step) => ({
    ...step,
    // Reformat dates using the current locale
    date:
      step.date && !isNaN(new Date(step.date).getTime())
        ? formatDate(new Date(step.date).toISOString(), i18n.language)
        : step.date || '',
  }));

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar
        title={t('clientOrderDetail:title', { id: order.id })}
        onBack={goBack}
        backLabel={t('clientOrderDetail:backLabel')}
      />

      {/* Order overview */}
      <section className="box" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              {t('clientOrderDetail:orderNumber', { id: order.id })}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{productName}</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:orderDate')}</p>
            <p style={{ fontWeight: 600 }}>{formatDate(order.created_at, i18n.language)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:estDelivery')}</p>
            <p style={{ fontWeight: 600 }}>{formatDate(order.due_date, i18n.language)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:total')}</p>
            <p style={{ fontWeight: 600 }}>{formatAmount(order.total_price, i18n.language)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:paid')}</p>
            <p style={{ fontWeight: 600 }}>{formatAmount(order.paid_amount, i18n.language)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:paymentStatus')}</p>
            <p style={{ fontWeight: 600 }}>{displayValue((order as any).payment_status)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:deliveryStatus')}</p>
            {delivery ? (
              <StatusBadge status={delivery.status} />
            ) : (
              <p style={{ fontWeight: 600 }}>{t('clientOrderDetail:noDelivery')}</p>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
            {t('clientOrderDetail:productionProgress')} — {progress}%
          </p>
          <ProgressBar
            percent={progress}
            color={
              order.status === 'CANCELLED'
                ? 'red'
                : progress >= 100
                ? 'green'
                : progress > 0
                ? 'orange'
                : undefined
            }
          />
        </div>
      </section>

      {/* Items and Specifications */}
      <section className="box" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>{t('clientOrderDetail:items.title')}</h3>
        {!order.item_details?.length ? (
          <p className="muted">{t('clientOrderDetail:items.empty')}</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {order.item_details.map((item) => (
              <div key={item.id} className="box" style={{ boxShadow: 'none' }}>
                <h4>
                  {displayValue(item.item_type)} — {displayValue(item.quantity)}{' '}
                  {t('clientOrderDetail:items.pcs')}
                </h4>
                <div className="spec-grid">
                  <p>{t('clientOrderDetail:items.pages')}<span>{displayValue(item.page_count ?? item.pages)}</span></p>
                  <p>{t('clientOrderDetail:items.size')}<span>{displayValue(item.size)}</span></p>
                  <p>{t('clientOrderDetail:items.material')}<span>{displayValue(item.paper ?? item.material)}</span></p>
                  <p>{t('clientOrderDetail:items.color')}<span>{displayValue(item.color_mode)}</span></p>
                  <p>{t('clientOrderDetail:items.cover')}<span>{displayValue(item.cover)}</span></p>
                  <p>{t('clientOrderDetail:items.binding')}<span>{displayValue(item.binding ?? item.coil)}</span></p>
                  <p>{t('clientOrderDetail:items.currentStep')}<span>{displayValue(item.current_step)}</span></p>
                  <p>{t('clientOrderDetail:items.notes')}<span>{displayValue(item.notes)}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        {/* Timeline */}
        <section className="box">
          <h3 style={{ marginBottom: 12 }}>{t('clientOrderDetail:timeline.title')}</h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
            {timeline.map((step, i) => {
              const label = step.labelParams
                ? t(step.labelKey, step.labelParams)
                : t(step.labelKey);
              return (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                  <span
                    style={{
                      color: step.done ? '#2c9a4b' : step.current ? '#e89023' : 'var(--muted)',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    {step.done ? '✓' : step.current ? '•' : '○'}
                  </span>
                  <span>
                    <strong style={{ color: step.done || step.current ? 'var(--text)' : 'var(--muted)' }}>
                      {label}
                    </strong>
                    {step.date && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>
                        {step.date}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Delivery */}
        <section className="box">
          <h3 style={{ marginBottom: 12 }}>{t('clientOrderDetail:delivery.title')}</h3>
          {delivery ? (
            <div className="spec-grid">
              <p>{t('clientOrderDetail:delivery.status')}<span>{delivery.status}</span></p>
              <p>{t('clientOrderDetail:delivery.scheduled')}<span>{formatDate(delivery.scheduledDate || null, i18n.language)}</span></p>
              <p>{t('clientOrderDetail:delivery.delivered')}<span>{formatDate(delivery.deliveredAt || null, i18n.language)}</span></p>
              <p>{t('clientOrderDetail:delivery.address')}<span>{displayValue(delivery.address)}</span></p>
              <p>{t('clientOrderDetail:delivery.driver')}<span>{displayValue(delivery.driver)}</span></p>
              <p>{t('clientOrderDetail:delivery.notes')}<span>{displayValue(delivery.notes)}</span></p>
            </div>
          ) : (
            <p className="muted">{t('clientOrderDetail:delivery.empty')}</p>
          )}
        </section>
      </div>

      {/* Help / Actions */}
      <section className="box">
        <div className="table-head">
          <p><strong>{t('clientOrderDetail:help.title')}</strong></p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => navigateTopLevel(`/client/track-order/${order.id}`)}>
              {t('clientOrderDetail:help.trackOrder')}
            </button>
            {order.invoice_id && order.invoice_id !== 'null' && (
              <button
                className="btn"
                onClick={() => navigateTopLevel(`/client/invoices/${order.invoice_id}`)}
              >
                {t('clientOrderDetail:help.viewInvoice')}
              </button>
            )}
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>
              {t('clientOrderDetail:help.contactSupport')}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
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

interface TrackingStep {
  labelKey: string;
  labelParams?: Record<string, string>;
  done: boolean;
  current: boolean;
}

interface TrackingUpdate {
  time: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  type: 'done' | 'info' | 'warn';
}

interface DetailRow {
  labelKey: string;
  value: string;
}

interface TrackingData {
  id: string;
  product: string;
  status: string;
  statusKey: string;
  orderDate: string;
  estimatedDelivery: string;
  total: string;
  progress: number;
  steps: TrackingStep[];
  updates: TrackingUpdate[];
  details: DetailRow[];
  deliveryMessage: string;
  deliveryStatus?: string;
  invoiceId?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string | null, lang: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function statusProgress(order: Order): number {
  if (order.status === 'CANCELLED') return 0;
  if (order.status === 'UNPRICED_PENDING') return 15;
  if (order.status === 'PRICED_PENDING_CONFIRMATION') return 35;
  if (order.status === 'CONFIRMED') return 50;
  if (order.status === 'IN_PROGRESS') return Math.max(60, Number(order.production_progress || 0));
  if (order.status === 'COMPLETED' || order.status === 'CLOSED') return 100;
  return 0;
}

function getStatusKey(status: string, progress: number): string {
  if (status === 'CANCELED') return 'trackOrder:statusLabels.canceled';
  if (status === 'COMPLETED') return 'trackOrder:statusLabels.completed';
  if (status === 'UNPRICED_PENDING') return 'trackOrder:statusLabels.unpricedPending';
  if (status === 'PRICED_PENDING_CONFIRMATION') return 'trackOrder:statusLabels.pricedPendingConfirmation';
  if (status === 'IN_PROGRESS') {
    return progress >= 80
      ? 'trackOrder:statusLabels.almostReady'
      : 'trackOrder:statusLabels.inProgress';
  }
  return 'trackOrder:statusLabels.unknown';
}

function buildSteps(order: Order): TrackingStep[] {
  const status = order.status;
  const delivery = order.delivery_info;
  const deliveryDone = delivery?.status === 'delivered';

  return [
    {
      labelKey: 'trackOrder:steps.orderPlaced',
      done: true,
      current: status === 'UNPRICED_PENDING',
    },
    {
      labelKey: 'trackOrder:steps.pricing',
      done: !['UNPRICED_PENDING', 'CANCELLED'].includes(status),
      current: status === 'UNPRICED_PENDING',
    },
    {
      labelKey: 'trackOrder:steps.quoteApproval',
      done: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status),
      current: status === 'PRICED_PENDING_CONFIRMATION',
    },
    {
      labelKey: 'trackOrder:steps.production',
      done: ['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status),
      current: status === 'CONFIRMED' || status === 'IN_PROGRESS',
    },
    {
      labelKey: 'trackOrder:steps.completed',
      done: ['COMPLETED', 'CLOSED'].includes(status),
      current: status === 'COMPLETED' && !delivery,
    },
    ...(delivery
      ? [{
          labelKey: 'trackOrder:steps.delivery',
          labelParams: { status: delivery.status.replace(/_/g, ' ') },
          done: deliveryDone,
          current: !deliveryDone,
        }]
      : []),
    ...(status === 'CANCELLED'
      ? [{
          labelKey: 'trackOrder:steps.cancelled',
          done: true,
          current: true,
        }]
      : []),
  ];
}

function buildUpdates(order: Order, lang: string): TrackingUpdate[] {
  const updates: TrackingUpdate[] = [];

  if (order.created_at) {
    updates.push({
      time: formatDateTime(order.created_at, lang),
      messageKey: 'trackOrder:updates.orderSubmitted',
      type: 'done',
    });
  }

  if (order.status === 'PRICED_PENDING_CONFIRMATION') {
    updates.push({
      time: formatDateTime(order.updated_at, lang),
      messageKey: 'trackOrder:updates.quoteSent',
      messageParams: { total: formatAmount(order.total_price, lang) },
      type: 'info',
    });
  }

  if (order.status === 'CANCELED') {
    updates.push({
      time: formatDateTime(order.updated_at, lang),
      messageKey: 'trackOrder:updates.orderCanceled',
      type: 'warn',
    });
  }

  // Add any completion event
  if (order.status === 'COMPLETED' || order.status === 'CLOSED') {
    updates.push({
      time: formatDateTime(order.updated_at, lang),
      messageKey: 'trackOrder:updates.orderCompleted',
      type: 'done',
    });
  }

  return updates.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function buildDetails(order: Order, lang: string): DetailRow[] {
  return [
    { labelKey: 'trackOrder:details.product', value: getProductName(order) },
    { labelKey: 'trackOrder:details.quantity', value: order.quantity ? `${order.quantity} pcs` : '—' },
    { labelKey: 'trackOrder:details.orderDate', value: formatDate(order.created_at, lang) },
    { labelKey: 'trackOrder:details.dueDate', value: formatDate(order.due_date, lang) },
    { labelKey: 'trackOrder:details.total', value: formatAmount(order.total_price, lang) },
    { labelKey: 'trackOrder:details.paid', value: formatAmount(order.paid_amount, lang) },
    { labelKey: 'trackOrder:details.paymentStatus', value: (order as any).payment_status || '—' },
    { labelKey: 'trackOrder:details.paymentMethod', value: order.payment_method || '—' },
    { labelKey: 'trackOrder:details.notes', value: order.notes || '—' },
  ];
}

function mapOrder(order: Order, lang: string): TrackingData {
  const delivery = order.delivery_info;
  const progress = statusProgress(order);
  return {
    id: String(order.id),
    product: getProductName(order),
    status: order.status,
    statusKey: getStatusKey(order.status, progress),
    orderDate: formatDate(order.created_at, lang),
    estimatedDelivery: formatDate(delivery?.scheduledDate || order.due_date || null, lang),
    total: formatAmount(order.total_price, lang),
    progress,
    steps: buildSteps(order),
    updates: buildUpdates(order, lang),
    details: buildDetails(order, lang),
    deliveryMessage: delivery
      ? `Delivery status: ${delivery.status.replace(/_/g, ' ')}`
      : 'No delivery has been created yet. Pickup/manual collection may apply.',
    deliveryStatus: delivery?.status,
    invoiceId: (order as any).invoice_id || undefined,
  };
}

// ─── Component ──────────────────────────────────────────────────────
export default function TrackOrder() {
  return (
    <Suspense fallback={null}>
      <TrackOrderInner />
    </Suspense>
  );
}

function TrackOrderInner() {
  const { t, i18n } = useTranslation(['common', 'trackOrder']);
  const { id: urlId } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [orderIdInput, setOrderIdInput] = useState(urlId || '');
  const [result, setResult] = useState<TrackingData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAndTrack = async (id: string) => {
    const numericId = parseInt(id.replace('#', '').trim(), 10);
    if (Number.isNaN(numericId)) {
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const res = await getOrderById(numericId);
      const order = res.data.data;
      if (!order) {
        setNotFound(true);
        return;
      }
      setResult(mapOrder(order, i18n.language));
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error('Tracking error:', err);
      }
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (idOverride?: string) => {
    const id = (idOverride ?? orderIdInput).replace('#', '').trim();
    if (id) fetchAndTrack(id);
  };

  useEffect(() => {
    if (urlId) {
      setOrderIdInput(urlId);
      handleTrack(urlId);
    }
  }, [urlId]);

  const lang = i18n.language;

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title={t('trackOrder:title')} />

      <section className="box center-card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 6 }}>{t('trackOrder:search.heading')}</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          {t('trackOrder:search.subtitle')}
        </p>
        <div className="actions-inline">
          <input
            className="input"
            type="text"
            placeholder={t('trackOrder:search.placeholder')}
            value={orderIdInput}
            onChange={(e) => {
              setOrderIdInput(e.target.value);
              setResult(null);
              setNotFound(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button
            className="btn primary"
            onClick={() => handleTrack()}
            disabled={loading}
          >
            {loading
              ? t('trackOrder:search.searching')
              : t('trackOrder:search.button')}
          </button>
        </div>
        {notFound && (
          <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8 }}>
            {t('trackOrder:search.notFound', { id: orderIdInput })}
          </p>
        )}
      </section>

      {result && !loading && (
        <>
          <section className="box" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  {t('trackOrder:result.orderInfo', { id: result.id, product: result.product })}
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  {t(result.statusKey)}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {t('trackOrder:result.summary', {
                    orderDate: result.orderDate,
                    estimatedDelivery: result.estimatedDelivery,
                    total: result.total,
                  })}
                </p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <ProgressBar
              percent={result.progress}
              color={
                result.progress >= 100 ? 'green' : result.progress > 0 ? 'orange' : undefined
              }
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 20 }}>
              {t('trackOrder:result.progress', { percent: result.progress })}
            </p>

            <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
              {result.steps.map((step, i) => {
                const isLast = i === result.steps.length - 1;
                const stepLabel = step.labelParams
                  ? t(step.labelKey, step.labelParams)
                  : t(step.labelKey);
                return (
                  <div
                    key={`${step.labelKey}-${i}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                  >
                    {!isLast && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 11,
                          left: '50%',
                          width: '100%',
                          height: 2,
                          background: step.done ? '#2c9a4b' : '#e4e6eb',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        background: step.done ? '#2c9a4b' : step.current ? '#2f3640' : '#e4e6eb',
                        color: step.done || step.current ? '#fff' : 'var(--muted)',
                        flexShrink: 0,
                      }}
                    >
                      {step.done ? '✓' : i + 1}
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        marginTop: 6,
                        textAlign: 'center',
                        lineHeight: 1.3,
                        fontWeight: step.current ? 700 : 400,
                        color: step.done ? '#2c9a4b' : step.current ? 'var(--text)' : 'var(--muted)',
                      }}
                    >
                      {stepLabel}
                      {step.current && (
                        <span style={{ display: 'block', color: '#e89023', fontWeight: 700 }}>
                          {t('trackOrder:result.now')}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid-2" style={{ marginBottom: 14 }}>
            <section className="box">
              <h3 style={{ marginBottom: 14 }}>{t('trackOrder:updates.title')}</h3>
              {result.updates.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>
                  {t('trackOrder:updates.noUpdates')}
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {result.updates.map((u, i) => {
                    const dotColor =
                      u.type === 'done' ? '#2c9a4b' : u.type === 'warn' ? '#e89023' : '#3498db';
                    const messageText = u.messageParams
                      ? t(u.messageKey, u.messageParams)
                      : t(u.messageKey);
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            marginTop: 4,
                            flexShrink: 0,
                            background: dotColor,
                          }}
                        />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                            {messageText}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--muted)' }}>{u.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="box">
              <h3 style={{ marginBottom: 14 }}>{t('trackOrder:details.title')}</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.details.map((d) => (
                  <div
                    key={d.labelKey}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 6,
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>{t(d.labelKey)}</span>
                    <span style={{ fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="box" style={{ marginBottom: 14 }}>
            <h3 style={{ marginBottom: 14 }}>{t('trackOrder:delivery.title')}</h3>
            <p>{t('trackOrder:delivery.message', { status: result.deliveryMessage })}</p>
            {result.deliveryStatus && <StatusBadge status={result.deliveryStatus} />}
          </section>

          <section className="box" style={{ marginBottom: 14 }}>
            <div className="table-head">
              <p><strong>{t('trackOrder:help.title')}</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                {result.invoiceId && (
                  <button
                    className="btn"
                    onClick={() =>
                      navigateTopLevel(`/client/invoices/${result.invoiceId}`)
                    }
                  >
                    {t('trackOrder:help.viewInvoice')}
                  </button>
                )}
                <button
                  className="btn primary"
                  onClick={() => navigateTopLevel('support')}
                >
                  {t('trackOrder:help.contactSupport')}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
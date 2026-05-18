import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrderById } from '../../lib/api/ordersQuotesService';

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'CANCELED') return 'red';
  if (progress >= 100) return 'green';
  return 'orange';
}

export default function ClientOrderDetail() {
  return (
    <Suspense fallback={null}>
      <ClientOrderDetailInner />
    </Suspense>
  );
}

function ClientOrderDetailInner() {
  const { t } = useTranslation(['common', 'clientOrderDetail']);
  const { id: routeOrderId } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [order, setOrder] = useState<any>(null);
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
        const numericId = parseInt(routeOrderId, 10);
        if (isNaN(numericId)) {
          setError(t('clientOrderDetail:errors.noId'));
          setLoading(false);
          return;
        }

        const res = await getOrderById(numericId);
        const backendOrder = res.data.data;

        const progress = backendOrder.status === 'COMPLETED' ? 100 : 0;
        const productName = backendOrder.upload?.file_name || `Order #${backendOrder.id}`;

        const displayOrder = {
          id: backendOrder.id,
          batch: '—',
          product: productName,
          status: backendOrder.status,
          delivery: backendOrder.status === 'COMPLETED' ? 'delivered' : '—',
          progress,
          color: getProgressColor(progress, backendOrder.status),
          date: formatDate(backendOrder.created_at),
          deliveryDate: formatDate(backendOrder.due_date || null),
          total: formatAmount(backendOrder.total_price),
          payment: backendOrder.payment_method || '—',
          paid: formatAmount(backendOrder.paid_amount),
          invoiceId: backendOrder.invoice_id || null,
          specs: {
            qty: backendOrder.quantity,
            description: backendOrder.notes || '',
          },
          timeline: [
            { labelKey: 'timeline.items.orderPlaced', date: formatDate(backendOrder.created_at), done: true },
            { labelKey: 'timeline.items.production', date: backendOrder.status === 'COMPLETED' ? formatDate(backendOrder.updated_at) : null, done: backendOrder.status === 'COMPLETED' },
            { labelKey: 'timeline.items.delivery', date: null, done: false },
          ],
        };

        setOrder(displayOrder);
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

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar
        title={t('clientOrderDetail:title', { id: order.id })}
        onBack={goBack}
        backLabel={t('clientOrderDetail:backLabel')}
      />

      <section className="box" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              {t('clientOrderDetail:batchCode')}: {order.batch}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{order.product}</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:orderDate')}</p><p style={{ fontWeight: 600 }}>{order.date}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:estDelivery')}</p><p style={{ fontWeight: 600 }}>{order.deliveryDate}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:total')}</p><p style={{ fontWeight: 600 }}>{order.total}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:paid')}</p><p style={{ fontWeight: 600 }}>{order.paid}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:paymentMethod')}</p><p style={{ fontWeight: 600 }}>{order.payment}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>{t('clientOrderDetail:deliveryStatus')}</p><StatusBadge status={order.delivery} /></div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
            {t('clientOrderDetail:productionProgress')} — {order.progress}%
          </p>
          <ProgressBar percent={order.progress} color={order.color} />
        </div>
      </section>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <section className="box">
          <h3 style={{ marginBottom: 12 }}>{t('clientOrderDetail:specs.title')}</h3>
          <div className="spec-grid">
            <p>{t('clientOrderDetail:specs.qty')}<span>{order.specs.qty || '—'}</span></p>
            <p>{t('clientOrderDetail:specs.notes')}<span>{order.specs.description || '—'}</span></p>
          </div>
        </section>

        <section className="box">
          <h3 style={{ marginBottom: 12 }}>{t('clientOrderDetail:timeline.title')}</h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
            {order.timeline.map((item: any, i: number) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                <span style={{ color: item.done ? '#2c9a4b' : 'var(--muted)', fontSize: 16, lineHeight: 1 }}>
                  {item.done ? '✓' : '○'}
                </span>
                <span>
                  <strong style={{ color: item.done ? 'var(--text)' : 'var(--muted)' }}>
                    {t(`clientOrderDetail:${item.labelKey}`)}
                  </strong>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>
                    {item.date ?? t('clientOrderDetail:timeline.pending')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="box">
        <div className="table-head">
          <p><strong>{t('clientOrderDetail:help.title')}</strong></p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => navigateTopLevel(`/client/track-order/${order.id}`)}>
              {t('clientOrderDetail:help.trackOrder')}
            </button>
            {order.invoiceId && order.invoiceId !== 'null' && (
              <button className="btn" onClick={() => navigateTopLevel(`/client/invoices/${order.invoiceId}`)}>
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

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getOrderById } from '../../lib/api/ordersQuotesService';

// ─── Helpers ──────────────────────────────────────────────────────────
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
  if (progress > 0) return 'orange';
  return 'orange';
}

export default function ClientOrderDetail() {
  const { id: routeOrderId } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeOrderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const numericId = parseInt(routeOrderId, 10);
        if (isNaN(numericId)) {
          setError(`Invalid order ID: ${routeOrderId}`);
          setLoading(false);
          return;
        }

        const res = await getOrderById(numericId);
        const backendOrder = res.data.data;
        console.log('ClientOrderDetail - raw order:', backendOrder);

        // Build display object – derive what we can, leave batch/delivery empty
        const progress = backendOrder.status === 'COMPLETED' ? 100 : 0;
        const productName = backendOrder.upload?.file_name || `Order #${backendOrder.id}`;

        const displayOrder = {
          id: backendOrder.id,
          batch: '—',                                 // no batch endpoint yet
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
            { label: 'Order placed', date: formatDate(backendOrder.created_at), done: true },
            { label: 'Production', date: backendOrder.status === 'COMPLETED' ? formatDate(backendOrder.updated_at) : 'Pending', done: backendOrder.status === 'COMPLETED' },
            { label: 'Delivery', date: '—', done: false },
          ],
        };

        setOrder(displayOrder);
      } catch (err) {
        console.error('Failed to load order details:', err);
        setError('Could not load order details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [routeOrderId]);

  if (loading) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title="Order Detail" />
        <div className="loading-state">Loading order details...</div>
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title="Order Detail" />
        <section className="table-wrap">
          <div className="error-state">{error || 'Order not found.'}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title={`Order ${order.id}`} onBack={goBack} backLabel="My Orders" />

      <section className="box" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Batch Code: {order.batch}</p>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{order.product}</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Order Date</p><p style={{ fontWeight: 600 }}>{order.date}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Est. Delivery</p><p style={{ fontWeight: 600 }}>{order.deliveryDate}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Total</p><p style={{ fontWeight: 600 }}>{order.total}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Paid</p><p style={{ fontWeight: 600 }}>{order.paid}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Payment Method</p><p style={{ fontWeight: 600 }}>{order.payment}</p></div>
          <div><p style={{ fontSize: 12, color: 'var(--muted)' }}>Delivery Status</p><StatusBadge status={order.delivery} /></div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Production Progress — {order.progress}%</p>
          <ProgressBar percent={order.progress} color={order.color} />
        </div>
      </section>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <section className="box">
          <h3 style={{ marginBottom: 12 }}>Specifications</h3>
          <div className="spec-grid">
            <p>Quantity<span>{order.specs.qty || '—'}</span></p>
            <p>Notes<span>{order.specs.description || '—'}</span></p>
            {/* Additional specs will appear once the backend model supports them */}
          </div>
        </section>

        <section className="box">
          <h3 style={{ marginBottom: 12 }}>Timeline</h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
            {order.timeline.map((t: any, i: number) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                <span style={{ color: t.done ? '#2c9a4b' : 'var(--muted)', fontSize: 16, lineHeight: 1 }}>
                  {t.done ? '✓' : '○'}
                </span>
                <span>
                  <strong style={{ color: t.done ? 'var(--text)' : 'var(--muted)' }}>{t.label}</strong>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{t.date || 'Pending'}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="box">
        <div className="table-head">
          <p><strong>Need help with this order?</strong></p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => navigateTopLevel(`/client/track-order/${order.id}`)}>Track Order</button>
            {order.invoiceId && order.invoiceId !== 'null' && (
              <button className="btn" onClick={() => navigateTopLevel(`/client/invoices/${order.invoiceId}`)}>View Invoice</button>
            )}
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
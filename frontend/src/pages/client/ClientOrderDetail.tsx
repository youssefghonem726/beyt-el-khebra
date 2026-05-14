import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

// Types based on normalized JSON files
interface Specs {
  size?: string;
  paper?: string;
  color?: string;
  finish?: string;
  qty?: number;
  description?: string;
}

interface TimelineItem {
  label: string;
  date: string | null;
  done: boolean;
}

interface Order {
  id: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number | null;
  paid: number | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  specs: Specs;
  timeline: TimelineItem[];
  clientId: string;
}

interface Batch {
  id: string;
  orderId: string;
  progress: number;
  status: string;
  deadline: string | null;
  stages: any[];
}

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  progress: number;
  scheduledDate: string;
  driver: string;
  company: string;
}

// Default order ID to use when no ID is provided in the URL
const DEFAULT_ORDER_ID = "ORD-1021-2025";

// Helper to format ISO date to "DD MMM YYYY"
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Helper to format currency
function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Map order status to a color for progress bar
function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'canceled') return 'red';
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

  // Use default order ID if none provided in the route
  const orderId = routeOrderId || DEFAULT_ORDER_ID;

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    // Fetch all required data in parallel
    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/deliveries.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, deliveriesData]) => {
        const orders: Order[] = ordersData;
        const batches: Batch[] = batchesData;
        const deliveries: Delivery[] = deliveriesData;

        // Find the order by its real ID
        const foundOrder = orders.find(o => o.id === orderId);
        if (!foundOrder) {
          setError(`Order ${orderId} not found.`);
          setLoading(false);
          return;
        }

        // Find associated batch (if any)
        const batch = batches.find(b => b.orderId === foundOrder.id);
        // Find associated delivery (if any)
        const delivery = deliveries.find(d => d.orderId === foundOrder.id);

        // Compute progress from batch, or fallback based on order status
        let progress = batch ? batch.progress : 0;
        if (foundOrder.status === 'completed') progress = 100;
        if (foundOrder.status === 'canceled') progress = 0;

        // Determine delivery status text for UI
        let deliveryStatus = foundOrder.deliveryDate ? 'scheduled' : '—';
        if (delivery) {
          deliveryStatus = delivery.status;
        } else if (foundOrder.status === 'completed') {
          deliveryStatus = 'delivered';
        } else if (foundOrder.status === 'canceled') {
          deliveryStatus = 'canceled';
        }

        // Build the enriched order object for the view
        const enrichedOrder = {
          id: foundOrder.id,
          batch: batch ? batch.id : '—',
          product: foundOrder.product,
          status: foundOrder.status,
          delivery: deliveryStatus,
          progress,
          color: getProgressColor(progress, foundOrder.status),
          date: formatDate(foundOrder.orderDate),
          deliveryDate: delivery?.scheduledDate ? formatDate(delivery.scheduledDate) : formatDate(foundOrder.deliveryDate),
          total: formatAmount(foundOrder.total),
          payment: foundOrder.paymentMethod || '—',
          paid: formatAmount(foundOrder.paid),
          invoiceId: foundOrder.invoiceId,
          specs: foundOrder.specs || {},
          timeline: foundOrder.timeline || []
        };

        setOrder(enrichedOrder);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load order details:', err);
        setError('Could not load order details. Please try again later.');
        setLoading(false);
      });
  }, [orderId]);

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
            <p>Size<span>{order.specs.size || '—'}</span></p>
            <p>Paper<span>{order.specs.paper || '—'}</span></p>
            <p>Color<span>{order.specs.color || '—'}</span></p>
            <p>Finish<span>{order.specs.finish || '—'}</span></p>
            <p>Quantity<span>{order.specs.qty || '—'}</span></p>
          </div>
        </section>

        <section className="box">
          <h3 style={{ marginBottom: 12 }}>Timeline</h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
            {(order.timeline && order.timeline.length > 0) ? (
              order.timeline.map((t: TimelineItem, i: number) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                  <span style={{ color: t.done ? '#2c9a4b' : 'var(--muted)', fontSize: 16, lineHeight: 1 }}>
                    {t.done ? '✓' : '○'}
                  </span>
                  <span>
                    <strong style={{ color: t.done ? 'var(--text)' : 'var(--muted)' }}>{t.label}</strong>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{t.date || 'Pending'}</span>
                  </span>
                </li>
              ))
            ) : (
              <li style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No timeline available</li>
            )}
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
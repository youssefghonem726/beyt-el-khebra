import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface TimelineItem {
  label: string;
  date: string;
  done: boolean;
}

interface Specs {
  size: string;
  paper: string;
  color: string;
  finish: string;
  qty: number;
}

interface Order {
  id: string;
  batch: string;
  product: string;
  status: string;
  delivery: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
  date: string;
  deliveryDate: string;
  total: string;
  payment: string;
  paid: string;
  invoiceId: string;
  specs: Specs;
  timeline: TimelineItem[];
}

export default function ClientOrderDetail() {
  const { id: orderId = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/client-orders-detail.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Record<string, Order>) => {
        const found = data[orderId];
        if (found) {
          setOrder(found);
        } else {
          setError(`Order #${orderId} not found.`);
        }
        setLoading(false);
      })
      .catch((err) => {
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
            <p>Size<span>{order.specs.size}</span></p>
            <p>Paper<span>{order.specs.paper}</span></p>
            <p>Color<span>{order.specs.color}</span></p>
            <p>Finish<span>{order.specs.finish}</span></p>
            <p>Quantity<span>{order.specs.qty}</span></p>
          </div>
        </section>

        <section className="box">
          <h3 style={{ marginBottom: 12 }}>Timeline</h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
            {order.timeline.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                <span style={{ color: t.done ? '#2c9a4b' : 'var(--muted)', fontSize: 16, lineHeight: 1 }}>
                  {t.done ? '✓' : '○'}
                </span>
                <span>
                  <strong style={{ color: t.done ? 'var(--text)' : 'var(--muted)' }}>{t.label}</strong>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{t.date}</span>
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
            <button className="btn" onClick={() => navigateTopLevel(`/client/track-order/${orderId}`)}>Track Order</button>
            {order.invoiceId && <button className="btn" onClick={() => navigateTopLevel(`/client/invoices/${order.invoiceId}`)}>View Invoice</button>}
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
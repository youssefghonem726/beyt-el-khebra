import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props {
  onNavigate: (page: string) => void;
  orderId: string;
}

const ORDER_DATA: Record<string, any> = {
  '1021': {
    id: '#1021', batch: 'B-240421-A', product: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION',
    delivery: 'ON TIME', progress: 75, color: 'green', date: '21 Apr 2025', deliveryDate: '25 Apr 2025',
    total: 'EGP 1,200.00', payment: 'Bank Transfer', paid: 'EGP 1,200.00', invoiceId: 'invoice-detail-INV-9021',
    specs: { size: '9 × 5.5 cm', paper: 'Matte 350gsm', color: 'Full Color', finish: 'Matte', qty: 500 },
    timeline: [
      { label: 'Order Submitted',       date: '21 Apr 2025, 10:00 AM', done: true  },
      { label: 'Pricing Confirmed',     date: '21 Apr 2025, 10:30 AM', done: true  },
      { label: 'Order Confirmed',       date: '21 Apr 2025, 11:15 AM', done: true  },
      { label: 'In Production',         date: '23 Apr 2025, 01:00 PM', done: true  },
      { label: 'Quality Check',         date: 'Pending',               done: false },
      { label: 'Ready for Delivery',    date: 'Pending',               done: false },
      { label: 'Delivered',             date: 'Pending',               done: false },
    ],
  },
  '1020': {
    id: '#1020', batch: 'B-240418-C', product: 'Flyers A5', status: 'IN_PROGRESS',
    delivery: 'DELAYED', progress: 55, color: 'orange', date: '18 Apr 2025', deliveryDate: '23 Apr 2025',
    total: 'EGP 2,400.00', payment: 'Cash', paid: 'EGP 1,000.00', invoiceId: 'invoice-detail-INV-9018',
    specs: { size: 'A5', paper: 'Glossy 150gsm', color: 'Full Color', finish: 'Glossy', qty: 200 },
    timeline: [
      { label: 'Order Submitted',    date: '18 Apr 2025, 09:00 AM', done: true  },
      { label: 'Pricing Confirmed',  date: '18 Apr 2025, 09:45 AM', done: true  },
      { label: 'Order Confirmed',    date: '18 Apr 2025, 10:30 AM', done: true  },
      { label: 'In Production',      date: '20 Apr 2025, 02:00 PM', done: true  },
      { label: 'Quality Check',      date: 'Pending',               done: false },
      { label: 'Ready for Delivery', date: 'Pending',               done: false },
      { label: 'Delivered',          date: 'Pending',               done: false },
    ],
  },
  '1018': {
    id: '#1018', batch: 'B-240415-B', product: 'Posters A3', status: 'UNPRICED_PENDING',
    delivery: '—', progress: 0, color: 'orange', date: '15 Apr 2025', deliveryDate: '—',
    total: '—', payment: '—', paid: '—', invoiceId: '',
    specs: { size: 'A3', paper: 'Glossy 200gsm', color: 'Full Color', finish: 'Glossy', qty: 50 },
    timeline: [
      { label: 'Order Submitted',    date: '15 Apr 2025, 11:00 AM', done: true  },
      { label: 'Pricing Confirmed',  date: 'Pending',               done: false },
      { label: 'Order Confirmed',    date: 'Pending',               done: false },
      { label: 'In Production',      date: 'Pending',               done: false },
      { label: 'Quality Check',      date: 'Pending',               done: false },
      { label: 'Ready for Delivery', date: 'Pending',               done: false },
      { label: 'Delivered',          date: 'Pending',               done: false },
    ],
  },
  '1015': {
    id: '#1015', batch: 'B-240410-S', product: 'Stickers', status: 'COMPLETED',
    delivery: 'ON TIME', progress: 100, color: 'green', date: '10 Apr 2025', deliveryDate: '14 Apr 2025',
    total: 'EGP 850.00', payment: 'Bank Transfer', paid: 'EGP 850.00', invoiceId: 'invoice-detail-INV-9015',
    specs: { size: '5 × 5 cm', paper: 'Vinyl', color: 'Full Color', finish: 'Glossy', qty: 300 },
    timeline: [
      { label: 'Order Submitted',    date: '10 Apr 2025, 09:00 AM', done: true },
      { label: 'Pricing Confirmed',  date: '10 Apr 2025, 10:00 AM', done: true },
      { label: 'Order Confirmed',    date: '10 Apr 2025, 10:45 AM', done: true },
      { label: 'In Production',      date: '11 Apr 2025, 08:00 AM', done: true },
      { label: 'Quality Check',      date: '13 Apr 2025, 02:00 PM', done: true },
      { label: 'Ready for Delivery', date: '14 Apr 2025, 09:00 AM', done: true },
      { label: 'Delivered',          date: '14 Apr 2025, 03:00 PM', done: true },
    ],
  },
  '1012': {
    id: '#1012', batch: 'B-240405-N', product: 'Banners', status: 'CANCELED',
    delivery: '—', progress: 0, color: 'red', date: '05 Apr 2025', deliveryDate: '—',
    total: '—', payment: '—', paid: '—', invoiceId: '',
    specs: { size: '200 × 80 cm', paper: 'PVC', color: 'Full Color', finish: 'Matte', qty: 5 },
    timeline: [
      { label: 'Order Submitted',    date: '05 Apr 2025, 10:00 AM', done: true  },
      { label: 'Pricing Confirmed',  date: '05 Apr 2025, 11:00 AM', done: true  },
      { label: 'Order Canceled',     date: '06 Apr 2025, 09:00 AM', done: true  },
      { label: 'In Production',      date: '—',                     done: false },
      { label: 'Quality Check',      date: '—',                     done: false },
      { label: 'Ready for Delivery', date: '—',                     done: false },
      { label: 'Delivered',          date: '—',                     done: false },
    ],
  },
};

export default function ClientOrderDetail({ onNavigate, orderId }: Props) {
  const order = ORDER_DATA[orderId];

  if (!order) {
    return (
      <AppShell role="client" activePage="my-orders" onNavigate={onNavigate}>
        <Topbar title="Order Detail" />
        <section className="table-wrap">
          <div className="error-state">Order not found.</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders" onNavigate={onNavigate}>
      <Topbar title={`Order ${order.id}`} />

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
            {order.timeline.map((t: any, i: number) => (
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
            <button className="btn" onClick={() => onNavigate('track-order')}>Track Order</button>
            {order.invoiceId && <button className="btn" onClick={() => onNavigate(order.invoiceId)}>View Invoice</button>}
            <button className="btn primary" onClick={() => onNavigate('support')}>Contact Support</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

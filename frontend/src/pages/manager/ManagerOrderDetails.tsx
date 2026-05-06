import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; orderId?: string; }

interface OrderData {
  client: string; batch: string; product: string; status: string;
  qty: number; deadline: string; step: string; progress: number;
  type: 'pending' | 'completed';
}

const ORDER_DATA: Record<string, OrderData> = {
  '1033': { client: 'Client Name', batch: 'B-260426-P', product: 'Packaging Sleeves', status: 'UNPRICED',         qty: 2500, deadline: '30 Apr 2026', step: 'File review',   progress: 10, type: 'pending'   },
  '1031': { client: 'Design Hub',  batch: 'B-260425-D', product: 'Brochures',          status: 'PENDING APPROVAL', qty: 500,  deadline: '27 Apr 2026', step: 'Awaiting quote', progress: 0,  type: 'pending'   },
  '1024': { client: 'Client Name', batch: 'B-260423-C', product: 'Business Cards',     status: 'COMPLETED',        qty: 1000, deadline: '26 Apr 2026', step: 'Done',          progress: 100, type: 'completed' },
  '1020': { client: 'Ahmed Store', batch: 'B-260420-A', product: 'Flyers',             status: 'COMPLETED',        qty: 200,  deadline: '26 Apr 2026', step: 'Done',          progress: 100, type: 'completed' },
};

export default function ManagerOrderDetails({ onNavigate, orderId }: Props) {
  const order = orderId ? ORDER_DATA[orderId] : null;

  if (!order) {
    return (
      <AppShell role="manager" activePage="manager-orders" onNavigate={onNavigate}>
        <Topbar title="Order Details" userName="Manager View" />
        <div className="error-state">Order not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="manager-orders" onNavigate={onNavigate}>
      <Topbar title={`Order Details #${orderId}`} userName="Manager View" />
      <section className="order-layout">
        <article className="stack">
          <section className="box">
            <h3>Order Overview</h3>
            <div className="spec-grid">
              <p>Client       <span>{order.client}</span></p>
              <p>Batch Code   <span>{order.batch}</span></p>
              <p>Product      <span>{order.product}</span></p>
              <p>Status       <span><StatusBadge status={order.status} /></span></p>
              <p>Quantity     <span>{order.qty}</span></p>
              <p>Deadline     <span>{order.deadline}</span></p>
            </div>
          </section>

          <section className="box">
            <h3>Production Progress</h3>
            <p><strong>Current Step:</strong> {order.step}</p>
            <ProgressBar percent={order.progress} style={{ marginTop: 10 }} />
            {order.type === 'completed' && (
              <p style={{ marginTop: 10, color: '#2c9a4b', fontWeight: 600 }}>All stages complete.</p>
            )}
            {order.type === 'pending' && (
              <ul style={{ marginTop: 10, fontSize: 13 }}>
                <li>Prepress: Pending</li>
                <li>Printing: Not started</li>
                <li>Finishing: Not started</li>
                <li>QC: Not started</li>
              </ul>
            )}
          </section>
        </article>

        <aside className="box">
          <h3>Manager Actions</h3>
          {order.type === 'pending' && (
            <>
              <button className="btn primary block" onClick={() => onNavigate('edit-order')}>
                Edit Order
              </button>
              <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('accounting')}>
                Send to Accounting
              </button>
            </>
          )}
          {order.type === 'completed' && (
            <>
              <button className="btn primary block" onClick={() => onNavigate('accounting')}>
                View Invoice
              </button>
              <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('delivery-list')}>
                View Delivery
              </button>
            </>
          )}
        </aside>
      </section>
    </AppShell>
  );
}

import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { navigateTopLevel: (page: string) => void; }

const KNOWN_ORDERS = ['1021', '#1021'];

export default function TrackOrder({ navigateTopLevel }: Props) {
  const [orderId, setOrderId] = useState('');
  const [tracked, setTracked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = () => {
    const normalized = orderId.replace('#', '').trim();
    if (KNOWN_ORDERS.includes(orderId.trim()) || KNOWN_ORDERS.includes('#' + normalized) || normalized === '1021') {
      setTracked(true);
      setNotFound(false);
    } else {
      setTracked(false);
      setNotFound(true);
    }
  };

  return (
    <AppShell role="client" activePage="my-orders" navigateTopLevel={navigateTopLevel}>
      <Topbar title="Track Order" />

      <section className="box center-card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 6 }}>Track Your Order</h2>
        <p className="muted" style={{ marginBottom: 14 }}>Enter your order ID to check the latest status.</p>
        <div className="actions-inline">
          <input
            className="input"
            type="text"
            placeholder="Enter Order ID (e.g. #1021)"
            value={orderId}
            onChange={(e) => { setOrderId(e.target.value); setTracked(false); setNotFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button className="btn primary" onClick={handleTrack}>Track Order</button>
        </div>
        {notFound && <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8 }}>No order found for "{orderId}". Please check the ID and try again.</p>}
        <p className="tiny muted" style={{ marginTop: 8 }}>Your information is secure and will not be shared.</p>
      </section>

      {tracked && <section className="box" id="order-status" style={{ marginBottom: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h2>Order Status</h2>
          <div className="actions-inline">
            <button className="btn" onClick={() => navigateTopLevel('invoice-detail-INV-9021')}>Download Invoice</button>
            <button className="btn" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        <article className="box" style={{ marginBottom: 14 }}>
          <h3>Order #1021 <StatusBadge status="IN PROGRESS" /></h3>
          <p>Business Cards | Ordered on: 21 Apr 2025</p>
          <p><strong>Estimated Delivery:</strong> 24 Apr 2025 | <strong>Total:</strong> EGP 1,200.00</p>
        </article>

        <h3 className="section-title">Overall Progress</h3>
        <ProgressBar percent={60} />
        <p className="muted tiny" style={{ marginTop: 6, marginBottom: 14 }}>60% completed. Your order is being printed.</p>

        <div className="split">
          <article className="box">
            <h3>Timeline</h3>
            <ul>
              <li>Order Submitted — 21 Apr 2025, 10:00 AM</li>
              <li>Pricing Confirmed — 21 Apr 2025, 10:30 AM</li>
              <li>Order Confirmed — 21 Apr 2025, 11:15 AM</li>
              <li>In Production — 23 Apr 2025, 01:00 PM</li>
              <li>Quality Check — Pending</li>
              <li>Ready for Delivery — Pending</li>
              <li>Delivered — Pending</li>
            </ul>
          </article>
          <article className="box">
            <h3>Order Details</h3>
            <ul>
              <li>Product: Business Cards</li>
              <li>Quantity: 1000</li>
              <li>Size: 9 x 5.5 cm</li>
              <li>Paper Type: Matte 350gsm</li>
              <li>Color: Full Color</li>
              <li>Finish: Matte</li>
              <li>Files: 1 file uploaded</li>
              <li>Special Notes: —</li>
            </ul>
          </article>
        </div>
      </section>}

      <section className="box">
        <div className="table-head">
          <p><strong>Need help?</strong> Our support team is here to help.</p>
          <button className="btn primary" onClick={() => navigateTopLevel('support')}>Contact Support</button>
        </div>
      </section>
    </AppShell>
  );
}

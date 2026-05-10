import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface Step  { label: string; done: boolean; current: boolean; }
interface Update { time: string; message: string; type: 'done' | 'info' | 'warn'; }

interface TrackingData {
  id: string;
  product: string;
  status: string;
  currentStatusLabel: string;
  orderDate: string;
  estimatedDelivery: string;
  total: string;
  progress: number;
  steps: Step[];
  updates: Update[];
  details: { label: string; value: string }[];
  invoiceId?: string;
}

const TRACKING: Record<string, TrackingData> = {
  '1021': {
    id: '#1021', product: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION',
    currentStatusLabel: 'Awaiting your confirmation to begin production.',
    orderDate: '21 Apr 2025', estimatedDelivery: '25 Apr 2025', total: 'EGP 1,200.00',
    progress: 30,
    steps: [
      { label: 'Order Submitted',    done: true,  current: false },
      { label: 'Priced',             done: true,  current: false },
      { label: 'Awaiting Approval',  done: false, current: true  },
      { label: 'In Production',      done: false, current: false },
      { label: 'Quality Check',      done: false, current: false },
      { label: 'Delivered',          done: false, current: false },
    ],
    updates: [
      { time: '21 Apr 2025, 11:00 AM', message: 'Quote sent to client — awaiting confirmation.',           type: 'info' },
      { time: '21 Apr 2025, 10:30 AM', message: 'Order priced successfully. Total: EGP 1,200.00.',         type: 'done' },
      { time: '21 Apr 2025, 10:00 AM', message: 'Order #1021 received and assigned for pricing.',          type: 'done' },
    ],
    details: [
      { label: 'Product',       value: 'Business Cards' },
      { label: 'Quantity',      value: '500 pcs' },
      { label: 'Size',          value: '9 × 5.5 cm' },
      { label: 'Paper Type',    value: 'Matte 350gsm' },
      { label: 'Color',         value: 'Full Color' },
      { label: 'Finish',        value: 'Matte' },
      { label: 'Files',         value: '1 file uploaded' },
      { label: 'Special Notes', value: 'Double-sided printing' },
    ],
    invoiceId: 'INV-9021',
  },

  '1020': {
    id: '#1020', product: 'Flyers A5', status: 'IN_PROGRESS',
    currentStatusLabel: 'Your order is currently being printed.',
    orderDate: '18 Apr 2025', estimatedDelivery: '23 Apr 2025', total: 'EGP 2,400.00',
    progress: 55,
    steps: [
      { label: 'Order Submitted', done: true,  current: false },
      { label: 'Priced',          done: true,  current: false },
      { label: 'Confirmed',       done: true,  current: false },
      { label: 'In Production',   done: false, current: true  },
      { label: 'Quality Check',   done: false, current: false },
      { label: 'Delivered',       done: false, current: false },
    ],
    updates: [
      { time: '20 Apr 2025, 02:00 PM', message: 'Printing started — 1,100 / 2,000 sheets done.',           type: 'info' },
      { time: '20 Apr 2025, 09:00 AM', message: 'Files approved. Job sent to press.',                       type: 'done' },
      { time: '19 Apr 2025, 03:00 PM', message: 'Delivery delayed by 1 day due to press queue.',           type: 'warn' },
      { time: '18 Apr 2025, 10:30 AM', message: 'Client confirmed quote. Order moved to production queue.', type: 'done' },
      { time: '18 Apr 2025, 09:00 AM', message: 'Order #1020 received and priced.',                         type: 'done' },
    ],
    details: [
      { label: 'Product',       value: 'Flyers A5' },
      { label: 'Quantity',      value: '2,000 pcs' },
      { label: 'Size',          value: 'A5 (148 × 210 mm)' },
      { label: 'Paper Type',    value: 'Glossy 130gsm' },
      { label: 'Color',         value: 'Full Color' },
      { label: 'Finish',        value: 'Glossy' },
      { label: 'Files',         value: '2 files uploaded' },
      { label: 'Special Notes', value: '—' },
    ],
  },

  '1018': {
    id: '#1018', product: 'Posters A3', status: 'UNPRICED_PENDING',
    currentStatusLabel: 'Your order is being reviewed for pricing.',
    orderDate: '15 Apr 2025', estimatedDelivery: '—', total: '—',
    progress: 10,
    steps: [
      { label: 'Order Submitted', done: true,  current: false },
      { label: 'Under Review',    done: false, current: true  },
      { label: 'Priced',          done: false, current: false },
      { label: 'In Production',   done: false, current: false },
      { label: 'Quality Check',   done: false, current: false },
      { label: 'Delivered',       done: false, current: false },
    ],
    updates: [
      { time: '15 Apr 2025, 04:00 PM', message: 'Order assigned to pricing team. Expected quote within 24 hours.', type: 'info' },
      { time: '15 Apr 2025, 02:00 PM', message: 'Order #1018 received successfully.',                              type: 'done' },
    ],
    details: [
      { label: 'Product',       value: 'Posters A3' },
      { label: 'Quantity',      value: '100 pcs' },
      { label: 'Size',          value: 'A3 (297 × 420 mm)' },
      { label: 'Paper Type',    value: 'Satin 170gsm' },
      { label: 'Color',         value: 'Full Color' },
      { label: 'Finish',        value: 'Satin' },
      { label: 'Files',         value: '1 file uploaded' },
      { label: 'Special Notes', value: '—' },
    ],
  },

  '1015': {
    id: '#1015', product: 'Stickers', status: 'COMPLETED',
    currentStatusLabel: 'Order completed and delivered on time.',
    orderDate: '10 Apr 2025', estimatedDelivery: '14 Apr 2025', total: 'EGP 850.00',
    progress: 100,
    steps: [
      { label: 'Order Submitted', done: true, current: false },
      { label: 'Priced',          done: true, current: false },
      { label: 'Confirmed',       done: true, current: false },
      { label: 'In Production',   done: true, current: false },
      { label: 'Quality Check',   done: true, current: false },
      { label: 'Delivered',       done: true, current: false },
    ],
    updates: [
      { time: '14 Apr 2025, 02:00 PM', message: 'Order delivered to client. Confirmed receipt.',              type: 'done' },
      { time: '14 Apr 2025, 09:00 AM', message: 'Order dispatched for delivery.',                             type: 'done' },
      { time: '13 Apr 2025, 02:00 PM', message: 'Quality check passed. All 500 stickers approved.',          type: 'done' },
      { time: '11 Apr 2025, 08:00 AM', message: 'Production started — die-cut vinyl stickers.',               type: 'done' },
      { time: '10 Apr 2025, 10:45 AM', message: 'Client confirmed quote. Order moved to production queue.',   type: 'done' },
      { time: '10 Apr 2025, 09:00 AM', message: 'Order #1015 received and priced.',                           type: 'done' },
    ],
    details: [
      { label: 'Product',       value: 'Stickers (Die-cut)' },
      { label: 'Quantity',      value: '500 pcs' },
      { label: 'Size',          value: '5 × 5 cm (round)' },
      { label: 'Paper Type',    value: 'Vinyl Matte' },
      { label: 'Color',         value: 'Full Color' },
      { label: 'Finish',        value: 'Matte Lamination' },
      { label: 'Files',         value: '1 file uploaded' },
      { label: 'Special Notes', value: 'Waterproof vinyl requested' },
    ],
    invoiceId: 'INV-9015',
  },

  '1012': {
    id: '#1012', product: 'Banners', status: 'CANCELED',
    currentStatusLabel: 'This order was canceled at client request.',
    orderDate: '05 Apr 2025', estimatedDelivery: '—', total: '—',
    progress: 0,
    steps: [
      { label: 'Order Submitted', done: true,  current: false },
      { label: 'Priced',          done: true,  current: false },
      { label: 'Canceled',        done: false, current: true  },
      { label: 'In Production',   done: false, current: false },
      { label: 'Quality Check',   done: false, current: false },
      { label: 'Delivered',       done: false, current: false },
    ],
    updates: [
      { time: '06 Apr 2025, 09:00 AM', message: 'Order canceled at client request. No charges applied.', type: 'warn' },
      { time: '05 Apr 2025, 11:00 AM', message: 'Order priced: pending client confirmation.',            type: 'done' },
      { time: '05 Apr 2025, 10:00 AM', message: 'Order #1012 received.',                                 type: 'done' },
    ],
    details: [
      { label: 'Product',       value: 'Roll-up Banners' },
      { label: 'Quantity',      value: '2 pcs' },
      { label: 'Size',          value: '85 × 200 cm' },
      { label: 'Paper Type',    value: 'PVC Banner' },
      { label: 'Color',         value: 'Full Color' },
      { label: 'Finish',        value: '—' },
      { label: 'Files',         value: 'None uploaded' },
      { label: 'Special Notes', value: 'Canceled by client request' },
    ],
  },
};

const progressColor = (p: number): 'green' | 'orange' | undefined =>
  p === 100 ? 'green' : p >= 50 ? 'orange' : undefined;

const updateDot: Record<Update['type'], { bg: string; color: string }> = {
  done: { bg: '#d1fae5', color: '#065f46' },
  info: { bg: '#dbeafe', color: '#1e40af' },
  warn: { bg: '#fef3c7', color: '#92400e' },
};

export default function TrackOrder() {
  const { id: urlId } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [orderId, setOrderId] = useState(urlId ? urlId.replace('#', '') : '');
  const [result, setResult] = useState<TrackingData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = (idOverride?: string) => {
    const key = (idOverride ?? orderId).replace('#', '').trim();
    const found = TRACKING[key];
    if (found) { setResult(found); setNotFound(false); }
    else        { setResult(null); setNotFound(true);  }
  };

  useEffect(() => { if (urlId) handleTrack(urlId); }, [urlId]);

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title="Track Order" />

      {/* Search */}
      <section className="box center-card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 6 }}>Track Your Order</h2>
        <p className="muted" style={{ marginBottom: 14 }}>Enter your order ID to see live tracking updates.</p>
        <div className="actions-inline">
          <input
            className="input"
            type="text"
            placeholder="Enter Order ID (e.g. #1021)"
            value={orderId}
            onChange={(e) => { setOrderId(e.target.value); setResult(null); setNotFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button className="btn primary" onClick={() => handleTrack()}>Track Order</button>
        </div>
        {notFound && (
          <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8 }}>
            No order found for "{orderId}". Please check the ID and try again.
          </p>
        )}
      </section>

      {result && (
        <>
          {/* Status banner */}
          <section className="box" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Order {result.id} · {result.product}</p>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{result.currentStatusLabel}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Ordered: {result.orderDate} &nbsp;·&nbsp; Est. Delivery: {result.estimatedDelivery}
                  {result.total !== '—' && <>&nbsp;·&nbsp; Total: <strong>{result.total}</strong></>}
                </p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <ProgressBar percent={result.progress} color={progressColor(result.progress)} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 20 }}>
              {result.progress}% complete
            </p>

            {/* Step tracker */}
            <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
              {result.steps.map((step, i) => {
                const isLast = i === result.steps.length - 1;
                return (
                  <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {!isLast && (
                      <div style={{
                        position: 'absolute', top: 11, left: '50%', width: '100%', height: 2,
                        background: step.done ? '#2c9a4b' : '#e4e6eb', zIndex: 0,
                      }} />
                    )}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', zIndex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: step.done ? '#2c9a4b' : step.current ? '#2f3640' : '#e4e6eb',
                      color: step.done || step.current ? '#fff' : 'var(--muted)',
                      border: step.current ? '2px solid #2f3640' : 'none',
                      flexShrink: 0,
                    }}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <p style={{
                      fontSize: 10, marginTop: 6, textAlign: 'center', lineHeight: 1.3,
                      fontWeight: step.current ? 700 : 400,
                      color: step.done ? '#2c9a4b' : step.current ? 'var(--text)' : 'var(--muted)',
                    }}>
                      {step.label}
                      {step.current && <span style={{ display: 'block', color: '#e89023', fontWeight: 700 }}>← now</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid-2" style={{ marginBottom: 14 }}>
            {/* Tracking updates */}
            <section className="box">
              <h3 style={{ marginBottom: 14 }}>Tracking Updates</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.updates.map((u, i) => {
                  const dot = updateDot[u.type];
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                        background: dot.bg, border: `2px solid ${dot.color}`,
                      }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{u.message}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)' }}>{u.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Order details */}
            <section className="box">
              <h3 style={{ marginBottom: 14 }}>Order Details</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.details.map((d) => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--muted)' }}>{d.label}</span>
                    <span style={{ fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Actions */}
          <section className="box" style={{ marginBottom: 14 }}>
            <div className="table-head">
              <p><strong>Need help with this order?</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                {result.invoiceId && (
                  <button className="btn" onClick={() => navigateTopLevel(`/client/invoices/${result.invoiceId}`)}>
                    View Invoice
                  </button>
                )}
                <button className="btn primary" onClick={() => navigateTopLevel('support')}>Contact Support</button>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

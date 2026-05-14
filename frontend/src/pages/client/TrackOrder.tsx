import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface TimelineItem {
  label: string;
  date: string | null;
  done: boolean;
}

interface Order {
  id: string;
  clientId: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number | null;
  paid: number | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  specs: Record<string, any>;
  timeline: TimelineItem[];
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
  scheduledDate: string;
}

// Step display for tracking
interface TrackingStep {
  label: string;
  done: boolean;
  current: boolean;
}

// Update entry
interface TrackingUpdate {
  time: string;
  message: string;
  type: 'done' | 'info' | 'warn';
}

// Detail row
interface DetailRow {
  label: string;
  value: string;
}

// All data for tracking view
interface TrackingData {
  id: string;
  product: string;
  status: string;
  currentStatusLabel: string;
  orderDate: string;
  estimatedDelivery: string;
  total: string;
  progress: number;
  steps: TrackingStep[];
  updates: TrackingUpdate[];
  details: DetailRow[];
  invoiceId?: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAmount(amount: number | null): string {
  if (amount === null) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProgressColor(progress: number): 'green' | 'orange' | undefined {
  if (progress === 100) return 'green';
  if (progress > 0) return 'orange';
  return undefined;
}

// Map order status to user-friendly label
function getCurrentStatusLabel(order: Order, progress: number): string {
  if (order.status === 'canceled') return 'This order was canceled.';
  if (order.status === 'completed') return 'Order completed and delivered.';
  if (order.status === 'unpriced_pending') return 'Your order is being reviewed for pricing.';
  if (order.status === 'priced_pending_confirmation') return 'Awaiting your confirmation to begin production.';
  if (order.status === 'in_progress') {
    if (progress >= 80) return 'Almost ready – final quality check.';
    return 'Your order is currently being produced.';
  }
  return 'Order status unknown.';
}

// Build steps from timeline
function buildSteps(timeline: TimelineItem[], progress: number, status: string): TrackingStep[] {
  if (!timeline.length) {
    // Fallback steps if no timeline
    return [
      { label: 'Order Submitted', done: status !== 'unpriced_pending', current: false },
      { label: 'Pricing', done: status !== 'unpriced_pending' && status !== 'priced_pending_confirmation', current: status === 'priced_pending_confirmation' },
      { label: 'Production', done: status === 'in_progress' && progress > 0, current: status === 'in_progress' && progress <= 80 },
      { label: 'Quality Check', done: status === 'completed', current: false },
      { label: 'Delivered', done: status === 'completed', current: false },
    ];
  }

  // Use timeline items as steps, determine current based on first incomplete
  let foundCurrent = false;
  return timeline.map(item => {
    if (!item.done && !foundCurrent) {
      foundCurrent = true;
      return { label: item.label, done: false, current: true };
    }
    return { label: item.label, done: item.done, current: false };
  });
}

// Build updates from timeline (use dates as "time")
function buildUpdates(timeline: TimelineItem[], order: Order): TrackingUpdate[] {
  const updates: TrackingUpdate[] = [];
  
  // Add timeline entries with dates
  timeline.forEach(item => {
    if (item.date) {
      updates.push({
        time: formatDateTime(item.date),
        message: `${item.label} ${item.done ? 'completed' : 'pending'}.`,
        type: item.done ? 'done' : 'info',
      });
    }
  });
  
  // Add special messages based on order status
  if (order.status === 'priced_pending_confirmation') {
    updates.unshift({
      time: formatDateTime(order.orderDate),
      message: `Quote sent – total ${formatAmount(order.total)}. Awaiting confirmation.`,
      type: 'info',
    });
  }
  if (order.status === 'canceled') {
    updates.push({
      time: formatDateTime(new Date().toISOString()),
      message: 'Order canceled at client request.',
      type: 'warn',
    });
  }
  
  // Sort by time (most recent first)
  return updates.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

// Build details from order specs
function buildDetails(order: Order): DetailRow[] {
  const details: DetailRow[] = [
    { label: 'Product', value: order.product },
    { label: 'Quantity', value: order.specs?.qty ? `${order.specs.qty} pcs` : '—' },
    { label: 'Size', value: order.specs?.size || '—' },
    { label: 'Paper / Material', value: order.specs?.paper || '—' },
    { label: 'Color', value: order.specs?.color || '—' },
    { label: 'Finish', value: order.specs?.finish || '—' },
    { label: 'Files', value: order.specs?.description ? 'Files provided' : '—' },
  ];
  if (order.specs?.description) {
    details.push({ label: 'Description', value: order.specs.description });
  }
  return details;
}

interface Props {
  /** Client ID (e.g., "CL-001") – defaults to CL-001 */
  clientId?: string;
}

export default function TrackOrder({ clientId = 'CL-001' }: Props) {
  const { id: urlId } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [orderIdInput, setOrderIdInput] = useState(urlId ? urlId.replace('#', '') : '');
  const [result, setResult] = useState<TrackingData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAndTrack = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    
    try {
      const [ordersRes, batchesRes, deliveriesRes] = await Promise.all([
        fetch('/data/json/orders.json'),
        fetch('/data/json/batches.json'),
        fetch('/data/json/deliveries.json'),
      ]);
      
      if (!ordersRes.ok) throw new Error('Failed to load orders');
      const orders: Order[] = await ordersRes.json();
      const batches: Batch[] = batchesRes.ok ? await batchesRes.json() : [];
      const deliveries: Delivery[] = deliveriesRes.ok ? await deliveriesRes.json() : [];
      
      // Find order: by full ID or by extracting numeric part (e.g., "1021" from "ORD-1021-2025")
      const searchId = id.trim();
      let order = orders.find(o => o.id === searchId && o.clientId === clientId);
      if (!order) {
        // Try to match by numeric suffix (e.g., "1021" matches "ORD-1021-2025")
        order = orders.find(o => o.clientId === clientId && o.id.includes(`-${searchId}-`));
      }
      
      if (!order) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      
      const batch = batches.find(b => b.orderId === order.id);
      const delivery = deliveries.find(d => d.orderId === order.id);
      
      const progress = batch?.progress ?? (order.status === 'completed' ? 100 : order.status === 'canceled' ? 0 : 30);
      const estimatedDelivery = delivery?.scheduledDate ?? order.deliveryDate;
      
      const steps = buildSteps(order.timeline || [], progress, order.status);
      const updates = buildUpdates(order.timeline || [], order);
      const details = buildDetails(order);
      
      const trackingData: TrackingData = {
        id: order.id,
        product: order.product,
        status: order.status,
        currentStatusLabel: getCurrentStatusLabel(order, progress),
        orderDate: formatDate(order.orderDate),
        estimatedDelivery: formatDate(estimatedDelivery),
        total: formatAmount(order.total),
        progress,
        steps,
        updates,
        details,
        invoiceId: order.invoiceId || undefined,
      };
      
      setResult(trackingData);
    } catch (err) {
      console.error('Tracking error:', err);
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
    if (urlId) handleTrack(urlId);
  }, [urlId, clientId]);
  
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
            placeholder="Enter Order ID (e.g. ORD-1021-2025 or #1021)"
            value={orderIdInput}
            onChange={(e) => { setOrderIdInput(e.target.value); setResult(null); setNotFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button className="btn primary" onClick={() => handleTrack()} disabled={loading}>
            {loading ? 'Searching...' : 'Track Order'}
          </button>
        </div>
        {notFound && (
          <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 8 }}>
            No order found for "{orderIdInput}". Please check the ID and try again.
          </p>
        )}
      </section>
      
      {result && !loading && (
        <>
          {/* Status banner */}
          <section className="box" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Order {result.id} · {result.product}</p>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{result.currentStatusLabel}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Ordered: {result.orderDate} &nbsp;·&nbsp; Est. Delivery: {result.estimatedDelivery}
                  {result.total !== 'EGP —' && <>&nbsp;·&nbsp; Total: <strong>{result.total}</strong></>}
                </p>
              </div>
              <StatusBadge status={result.status} />
            </div>
            
            <ProgressBar percent={result.progress} color={getProgressColor(result.progress)} />
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
              {result.updates.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>No updates yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {result.updates.map((u, i) => {
                    const dotColor = u.type === 'done' ? '#2c9a4b' : u.type === 'warn' ? '#e89023' : '#3498db';
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                          background: dotColor,
                        }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{u.message}</p>
                          <p style={{ fontSize: 11, color: 'var(--muted)' }}>{u.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
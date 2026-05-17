import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrderById, getOrders } from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import { getDeliveries } from '../../lib/api/deliveriesService';

// ─── Display types ─────────────────────────────────────────────────
interface TrackingStep {
  label: string;
  done: boolean;
  current: boolean;
}

interface TrackingUpdate {
  time: string;
  message: string;
  type: 'done' | 'info' | 'warn';
}

interface DetailRow {
  label: string;
  value: string;
}

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

// ─── Helpers ───────────────────────────────────────────────────────
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProgressColor(progress: number): 'green' | 'orange' | undefined {
  if (progress === 100) return 'green';
  if (progress > 0) return 'orange';
  return undefined;
}

function getCurrentStatusLabel(status: string, progress: number): string {
  if (status === 'CANCELED') return 'This order was canceled.';
  if (status === 'COMPLETED') return 'Order completed and delivered.';
  if (status === 'UNPRICED_PENDING') return 'Your order is being reviewed for pricing.';
  if (status === 'PRICED_PENDING_CONFIRMATION') return 'Awaiting your confirmation to begin production.';
  if (status === 'IN_PROGRESS') {
    if (progress >= 80) return 'Almost ready – final quality check.';
    return 'Your order is currently being produced.';
  }
  return 'Order status unknown.';
}

function buildSteps(status: string, progress: number, stages?: any[]): TrackingStep[] {
  // If batch has stages, use them
  if (stages && stages.length > 0) {
    let foundCurrent = false;
    return stages.map((s: any) => {
      const isDone = s.status === 'completed' || s.status === 'done';
      if (!isDone && !foundCurrent) {
        foundCurrent = true;
        return { label: s.stage || s.label || 'Step', done: false, current: true };
      }
      return { label: s.stage || s.label || 'Step', done: isDone, current: false };
    });
  }

  // Fallback steps based on status and progress
  const steps: TrackingStep[] = [
    { label: 'Order Placed', done: true, current: false },
    { label: 'Pricing', done: status !== 'UNPRICED_PENDING' && status !== 'PRICED_PENDING_CONFIRMATION', current: status === 'PRICED_PENDING_CONFIRMATION' },
    { label: 'Production', done: (status === 'IN_PROGRESS' && progress > 0) || status === 'COMPLETED', current: status === 'IN_PROGRESS' && progress < 80 },
    { label: 'Quality Check', done: status === 'COMPLETED', current: status === 'IN_PROGRESS' && progress >= 80 },
    { label: 'Delivered', done: status === 'COMPLETED', current: false },
  ];
  return steps;
}

function buildUpdates(order: any, stages?: any[]): TrackingUpdate[] {
  const updates: TrackingUpdate[] = [];

  // Order created
  if (order.created_at) {
    updates.push({
      time: formatDateTime(order.created_at),
      message: 'Order submitted.',
      type: 'done',
    });
  }

  // Batch stages
  if (stages) {
    stages.forEach((s: any) => {
      updates.push({
        time: formatDateTime(s.updated_at || s.updatedAt),
        message: `${s.stage || s.label}: ${s.status}`,
        type: s.status === 'completed' ? 'done' : 'info',
      });
    });
  }

  // Status-specific messages
  if (order.status === 'PRICED_PENDING_CONFIRMATION') {
    updates.push({
      time: formatDateTime(order.updated_at),
      message: `Quote sent – total ${formatAmount(order.total_price)}. Awaiting confirmation.`,
      type: 'info',
    });
  }
  if (order.status === 'CANCELED') {
    updates.push({
      time: formatDateTime(order.updated_at),
      message: 'Order canceled.',
      type: 'warn',
    });
  }

  return updates.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function buildDetails(order: any, batch?: any): DetailRow[] {
  return [
    { label: 'Product', value: order.upload?.file_name || `Order #${order.id}` },
    { label: 'Quantity', value: order.quantity ? `${order.quantity} pcs` : (batch?.qty ? `${batch.qty} pcs` : '—') },
    { label: 'Order Date', value: formatDate(order.created_at) },
    { label: 'Due Date', value: formatDate(order.due_date) },
    { label: 'Payment Method', value: order.payment_method || '—' },
    { label: 'Notes', value: order.notes || '—' },
  ];
}

export default function TrackOrder() {
  const { id: urlId } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [orderIdInput, setOrderIdInput] = useState(urlId || '');
  const [result, setResult] = useState<TrackingData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAndTrack = async (id: string) => {
    const numericId = parseInt(id.replace('#', '').trim(), 10);
    if (isNaN(numericId)) {
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      // Fetch the specific order, then batches and deliveries to find matches
      const [orderRes, batchesRes, deliveriesRes] = await Promise.all([
        getOrderById(numericId),
        getBatches().catch(() => ({ data: { data: [] } })),
        getDeliveries().catch(() => ({ data: { data: [] } })),
      ]);

      const order = orderRes.data.data;
      if (!order) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const batches = batchesRes.data.data || [];
      const deliveries = deliveriesRes.data.data || [];

      // Find matching batch and delivery by order ID
      const batch = batches.find((b: any) => b.orderId === order.id || b.order_id === order.id);
      const delivery = deliveries.find((d: any) => d.orderId === order.id || d.order_id === order.id);

      const progress = batch?.progress ?? (order.status === 'COMPLETED' ? 100 : order.status === 'CANCELED' ? 0 : 30);
      const estimatedDelivery = delivery?.scheduledDate ?? order.due_date;
      const stages = batch?.stages || [];

      const steps = buildSteps(order.status, progress, stages);
      const updates = buildUpdates(order, stages);
      const details = buildDetails(order, batch);

      const trackingData: TrackingData = {
        id: String(order.id),
        product: order.upload?.file_name || `Order #${order.id}`,
        status: order.status,
        currentStatusLabel: getCurrentStatusLabel(order.status, progress),
        orderDate: formatDate(order.created_at),
        estimatedDelivery: formatDate(estimatedDelivery),
        total: formatAmount(order.total_price),
        progress,
        steps,
        updates,
        details,
        invoiceId: order.invoice_id || undefined,
      };

      setResult(trackingData);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error('Tracking error:', err);
        setNotFound(true);
      }
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

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title="Track Order" />

      <section className="box center-card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 6 }}>Track Your Order</h2>
        <p className="muted" style={{ marginBottom: 14 }}>Enter your order ID to see live tracking updates.</p>
        <div className="actions-inline">
          <input
            className="input"
            type="text"
            placeholder="Enter Order ID (e.g. 1021)"
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
          <section className="box" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Order #{result.id} · {result.product}</p>
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
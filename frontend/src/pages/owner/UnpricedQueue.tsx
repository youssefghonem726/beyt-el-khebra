import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import { getUnpricedQueue, submitQuoteForOrder } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface UnpricedJob {
  id: string;          
  displayId: string;   
  client: string;
  product: string;
  items: Array<{
    id: number | string;
    item_type: string;
    quantity: number;
    notes?: string | null;
  }>;
  qty: number;
  deadline: string;    
  dueDate: string | null;
  createdAt: string | null;
}

interface PricingState {
  unitPrice: string;
  vatRate: string;
  notes: string;
}

// Helpers
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getShortOrderId(id: number | string): string {
  const num = typeof id === 'number' ? id : parseInt(id, 10);
  return isNaN(num) ? `#${id}` : `#${num}`;
}

function getProductFallback(order: any): string {
  return order.product_summary || order.upload?.file_name || `Order #${order.id}`;
}

export default function UnpricedQueue() {
  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingState>({ unitPrice: '', vatRate: '14', notes: '' });
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, clientsRes] = await Promise.all([
        getUnpricedQueue(),
        getClients(),
      ]);

      const orders = ordersRes.data.data;
      const clients = clientsRes.data.data.results;

      const clientsMap = new Map(clients.map((c: any) => {
        const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.name || c.email;
        return [String(c.id), name];
      }));

      const jobList: UnpricedJob[] = orders.map((order: any) => {
        const items = Array.isArray(order.item_details) ? order.item_details : [];
        const qty = items.length
          ? items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0)
          : order.quantity ?? order.item_count ?? 0;
        const deadlineIso = order.due_date ?? null;
        const clientName =
          order.customer_name ||
          order.customer_email ||
          clientsMap.get(String(order.customer)) ||
          'Unknown';
        const productName = getProductFallback(order);

        return {
          id: String(order.id),
          displayId: getShortOrderId(order.id),
          client: clientName,
          product: productName,
          items: items.map((item: any) => ({
            id: item.id,
            item_type: item.item_type || 'Item',
            quantity: Number(item.quantity) || 1,
            notes: item.notes ?? null,
          })),
          qty,
          deadline: formatDate(deadlineIso),
          dueDate: deadlineIso,
          createdAt: order.created_at ?? null,
        };
      });

      setJobs(jobList);
    } catch (err) {
      console.error('Failed to load unpriced queue:', err);
      setError('Could not load unpriced jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPricing = (id: string) => {
    setPricingId(id === pricingId ? null : id);
    setPricing({ unitPrice: '', vatRate: '14', notes: '' });
  };

  const submitPrice = async (job: UnpricedJob) => {
    if (!pricing.unitPrice || parseFloat(pricing.unitPrice) <= 0) return;

    const total = getTotal(job.qty || 1);
    const quoteItems = job.items.length
      ? job.items.map(item => {
          const itemQuantity = item.quantity || 1;
          const itemTotal = getTotal(itemQuantity);
          return {
            item_type: item.item_type,
            quantity: itemQuantity,
            estimated_unit_price: unitPrice,
            estimated_total_price: itemTotal,
            notes: pricing.notes || item.notes || '',
          };
        })
      : [
          {
            item_type: job.product,
            quantity: job.qty || 1,
            estimated_unit_price: unitPrice,
            estimated_total_price: total,
            notes: pricing.notes,
          },
        ];
    setSubmittingId(job.id);
    setError(null);

    try {
      await submitQuoteForOrder(Number(job.id), {
        order_id: Number(job.id),
        status: 'pending',
        total_estimated_price: total,
        notes: pricing.notes,
        items: quoteItems,
      });

      setPricingId(null);
      setPricing({ unitPrice: '', vatRate: '14', notes: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to submit quote:', err);
      setError('Could not submit quote. Please check the price and try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  const unitPrice = parseFloat(pricing.unitPrice) || 0;
  const vatRate = parseFloat(pricing.vatRate) / 100 || 0;

  const getSubtotal = (qty: number) => unitPrice * qty;
  const getVat = (qty: number) => getSubtotal(qty) * vatRate;
  const getTotal = (qty: number) => getSubtotal(qty) + getVat(qty);

  const fmt = (n: number) =>
    n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const now = new Date();
  const dueSoon = jobs.filter((job) => {
    if (!job.dueDate) return false;
    const dueDate = new Date(job.dueDate);
    const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }).length;
  const overdue = jobs.filter((job) => {
    if (!job.dueDate) return false;
    return new Date(job.dueDate).getTime() < now.getTime();
  }).length;
  const averageProcessingDays = jobs.length
    ? jobs.reduce((sum, job) => {
        if (!job.createdAt) return sum;
        const createdAt = new Date(job.createdAt);
        if (isNaN(createdAt.getTime())) return sum;
        return sum + Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / jobs.length
    : 0;

  const shell = (children: React.ReactNode) => (
    <AppShell role="owner" activePage="unpriced-queue">
      <Topbar title="Unpriced Queue" />
      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Total Unpriced" value={jobs.length} sub="Jobs waiting for pricing" />
        <StatCard label="Due Soon" value={dueSoon} sub="Due within 3 days" />
        <StatCard label="Overdue" value={overdue} sub={overdue === 0 ? 'No overdue jobs' : 'Past due date'} />
        <StatCard label="Average Processing" value={`${averageProcessingDays.toFixed(1)}d`} sub="Average queue age" />
      </section>
      {children}
    </AppShell>
  );

  if (loading) return shell(<div className="loading-state">Loading jobs...</div>);
  if (error) return shell(<div className="error-state">{error}</div>);

  return shell(
    <section className="table-wrap">
      <div className="table-head">
        <h3>Unpriced Jobs</h3>
      </div>

      {jobs.length === 0 && (
        <p className="muted" style={{ padding: '20px 0' }}>All jobs have been priced.</p>
      )}

      <div className="stack">
        {jobs.map((j) => {
          const isOpen = pricingId === j.id;
          return (
            <article key={j.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4>{j.displayId}</h4>
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#fef3cd',
                  color: '#856404',
                  fontWeight: 600,
                }}>
                  UNPRICED
                </span>
              </div>
              <p style={{ marginBottom: 2 }}><strong>Client:</strong> {j.client}</p>
              {j.items.length <= 1 ? (
                <p style={{ marginBottom: 2 }}>
                  <strong>Product:</strong>{' '}
                  {j.items[0] ? `${j.items[0].item_type} (${j.items[0].quantity} pcs)` : j.product}
                </p>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ marginBottom: 4 }}><strong>Products:</strong></p>
                  <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                    {j.items.map(item => (
                      <li key={item.id}>
                        {item.item_type} - {item.quantity} pcs
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ marginBottom: 2 }}><strong>Quantity:</strong> {j.qty} pcs</p>
              <p style={{ marginBottom: 10 }}><strong>Deadline:</strong> {j.deadline}</p>

              <div className="card-actions">
                <button
                  className={`btn${isOpen ? ' primary' : ''}`}
                  onClick={() => openPricing(j.id)}
                >
                  {isOpen ? 'Cancel' : 'Price This Job'}
                </button>
              </div>

              {isOpen && (
                <div style={{
                  marginTop: 14,
                  padding: '16px',
                  background: 'var(--surface-2, #f8f9fb)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>Set Price for {j.displayId}</h4>

                  {/* Price list removed – settings endpoint pending */}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Unit Price (EGP)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 2.50"
                        value={pricing.unitPrice}
                        onChange={(e) => setPricing((p) => ({ ...p, unitPrice: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>VAT Rate (%)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="14"
                        value={pricing.vatRate}
                        onChange={(e) => setPricing((p) => ({ ...p, vatRate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {unitPrice > 0 && (
                    <div style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 13,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">Subtotal ({j.qty} × EGP {fmt(unitPrice)})</span>
                        <span>EGP {fmt(getSubtotal(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">VAT ({pricing.vatRate}%)</span>
                        <span>EGP {fmt(getVat(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Total</span>
                        <span>EGP {fmt(getTotal(j.qty))}</span>
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>Notes (optional)</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, resize: 'vertical' }}
                      placeholder="Any special pricing notes or conditions…"
                      value={pricing.notes}
                      onChange={(e) => setPricing((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn primary"
                      disabled={!pricing.unitPrice || unitPrice <= 0 || submittingId === j.id}
                      onClick={() => submitPrice(j)}
                    >
                      {submittingId === j.id ? 'Submitting...' : 'Submit Quote'}
                    </button>
                    <button className="btn" onClick={() => setPricingId(null)} disabled={submittingId === j.id}>Cancel</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

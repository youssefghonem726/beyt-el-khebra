import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import { getOrders, submitQuoteForOrder } from '../../lib/api';

interface UnpricedJob {
  id: number;
  displayId: string;
  client: string;
  product: string;
  qty: number;
  deadline: string;
}

interface PricingState {
  unitPrice: string;
  vatRate: string;
  notes: string;
}

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return '—';

  const d = new Date(dateValue);

  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getShortOrderId(id: number): string {
  return `#${id}`;
}

function normalizeStatus(status: string | null | undefined): string {
  return String(status || '').toUpperCase();
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getOrdersArray(responseData: any): any[] {
  const data = responseData?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.orders)) return data.orders;

  return [];
}

export default function UnpricedQueue() {
  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<number | null>(null);
  const [pricing, setPricing] = useState<PricingState>({
    unitPrice: '',
    vatRate: '14',
    notes: '',
  });
  const [priced, setPriced] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const ordersRes = await getOrders();
        const orders = getOrdersArray(ordersRes.data);

        const unpricedOrders = orders.filter(
          (order: any) => normalizeStatus(order.status) === 'UNPRICED_PENDING'
        );

        const jobList: UnpricedJob[] = unpricedOrders.map((order: any) => {
          const id = toNumber(order.id);

          return {
            id,
            displayId: getShortOrderId(id),
            client:
              order.customer_name ||
              order.client_name ||
              order.customer?.name ||
              order.customer?.email ||
              order.client?.name ||
              order.client?.email ||
              'Unknown Client',
            product:
              order.product ||
              order.order_type ||
              order.type ||
              order.title ||
              'Print Order',
            qty: toNumber(order.quantity || order.qty || order.total_quantity),
            deadline: formatDate(order.due_date || order.delivery_date || order.completion_date),
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

    fetchData();
  }, []);

  const openPricing = (id: number) => {
    setPricingId(id === pricingId ? null : id);
    setPricing({ unitPrice: '', vatRate: '14', notes: '' });
  };

  const submitPrice = async (job: UnpricedJob) => {
    const unitPrice = parseFloat(pricing.unitPrice);

    if (!unitPrice || unitPrice <= 0) return;

    const subtotal = job.qty * unitPrice;
    const vat = subtotal * ((parseFloat(pricing.vatRate) || 0) / 100);
    const total = subtotal + vat;

    const quotePayload = {
      order_id: job.id,
      status: 'pending',
      total_estimated_price: total,
      notes: pricing.notes,
      items: [
        {
          item_type: job.product || 'Print Order',
          quantity: job.qty,
          estimated_unit_price: unitPrice,
          estimated_total_price: total,
          notes: pricing.notes,
        },
      ],
    };

    try {
      await submitQuoteForOrder(job.id, quotePayload);

      setPriced((current) => {
        const next = new Set(current);
        next.add(job.id);
        return next;
      });

      setPricingId(null);
    } catch (err) {
      console.error('Failed to submit quote:', err);
      alert('Failed to submit quote. Please try again.');
    }
  };

  const unitPrice = parseFloat(pricing.unitPrice) || 0;
  const vatRate = parseFloat(pricing.vatRate) / 100 || 0;

  const getSubtotal = (qty: number) => unitPrice * qty;
  const getVat = (qty: number) => getSubtotal(qty) * vatRate;
  const getTotal = (qty: number) => getSubtotal(qty) + getVat(qty);

  const fmt = (n: number) =>
    n.toLocaleString('en-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pending = jobs.filter((job) => !priced.has(job.id));

  const dueSoon = pending.filter((job) => job.deadline !== '—').length;

  const shell = (children: React.ReactNode) => (
    <AppShell role="owner" activePage="unpriced-queue">
      <Topbar title="Unpriced Queue" />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard
          label="Total Unpriced"
          value={pending.length}
          sub="Jobs waiting for pricing"
        />
        <StatCard
          label="Due Soon"
          value={dueSoon}
          sub="Orders with due dates"
        />
        <StatCard
          label="Overdue"
          value={0}
          sub="Not calculated yet"
        />
        <StatCard
          label="Average Processing"
          value="—"
          sub="Not implemented yet"
        />
      </section>

      {children}
    </AppShell>
  );

  if (loading) {
    return shell(<div className="loading-state">Loading jobs...</div>);
  }

  if (error) {
    return shell(<div className="error-state">{error}</div>);
  }

  return shell(
    <section className="table-wrap">
      <div className="table-head">
        <h3>Unpriced Jobs</h3>

        {priced.size > 0 && (
          <span className="muted" style={{ fontSize: 13 }}>
            {priced.size} job{priced.size > 1 ? 's' : ''} priced this session
          </span>
        )}
      </div>

      {pending.length === 0 && (
        <p className="muted" style={{ padding: '20px 0' }}>
          No unpriced jobs found.
        </p>
      )}

      <div className="stack">
        {pending.map((job) => {
          const isOpen = pricingId === job.id;

          return (
            <article key={job.id} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <h4>{job.displayId}</h4>

                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: '#fef3cd',
                    color: '#856404',
                    fontWeight: 600,
                  }}
                >
                  UNPRICED
                </span>
              </div>

              <p style={{ marginBottom: 2 }}>
                <strong>Client:</strong> {job.client}
              </p>

              <p style={{ marginBottom: 2 }}>
                <strong>Product:</strong> {job.product}
              </p>

              <p style={{ marginBottom: 2 }}>
                <strong>Quantity:</strong> {job.qty} pcs
              </p>

              <p style={{ marginBottom: 10 }}>
                <strong>Deadline:</strong> {job.deadline}
              </p>

              <div className="card-actions">
                <button
                  className={`btn${isOpen ? ' primary' : ''}`}
                  onClick={() => openPricing(job.id)}
                >
                  {isOpen ? 'Cancel' : 'Price This Job'}
                </button>
              </div>

              {isOpen && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    background: 'var(--surface-2, #f8f9fb)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>
                    Set Price for {job.displayId}
                  </h4>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div className="field" style={{ margin: 0 }}>
                      <label>Unit Price (EGP)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 2.50"
                        value={pricing.unitPrice}
                        onChange={(e) =>
                          setPricing((current) => ({
                            ...current,
                            unitPrice: e.target.value,
                          }))
                        }
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
                        onChange={(e) =>
                          setPricing((current) => ({
                            ...current,
                            vatRate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {unitPrice > 0 && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: '10px 14px',
                        background: '#fff',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span className="muted">
                          Subtotal ({job.qty} × EGP {fmt(unitPrice)})
                        </span>
                        <span>EGP {fmt(getSubtotal(job.qty))}</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span className="muted">VAT ({pricing.vatRate}%)</span>
                        <span>EGP {fmt(getVat(job.qty))}</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 700,
                        }}
                      >
                        <span>Total</span>
                        <span>EGP {fmt(getTotal(job.qty))}</span>
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>Notes optional</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, resize: 'vertical' }}
                      placeholder="Any special pricing notes or conditions..."
                      value={pricing.notes}
                      onChange={(e) =>
                        setPricing((current) => ({
                          ...current,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn primary"
                      disabled={!pricing.unitPrice || unitPrice <= 0}
                      onClick={() => submitPrice(job)}
                    >
                      Submit Quote
                    </button>

                    <button className="btn" onClick={() => setPricingId(null)}>
                      Cancel
                    </button>
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
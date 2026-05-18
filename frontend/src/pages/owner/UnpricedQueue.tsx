import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import { getUnpricedQueue, submitQuoteForOrder, updateOrder } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface UnpricedItem {
  id: number | string;
  item_type: string;
  quantity: number;
  notes?: string | null;
  due_date?: string | null;
  page_count?: number | string | null;
  pages?: number | string | null;
  size?: string | null;
  paper?: string | null;
  material?: string | null;
  color_mode?: string | null;
  cover?: string | null;
  binding?: string | null;
  coil?: string | null;
}

interface UnpricedJob {
  id: string;
  displayId: string;
  client: string;
  clientEmail: string;
  product: string;
  items: UnpricedItem[];
  qty: number;
  deadline: string;
  dueDate: string | null;
  createdAt: string | null;
  notes?: string | null;
  uploadLabel?: string | null;
}

interface PricingState {
  unitPrice: string;
  vatRate: string;
  notes: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Not provided';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Not provided';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getShortOrderId(id: number | string): string {
  const num = typeof id === 'number' ? id : parseInt(id, 10);
  return Number.isNaN(num) ? `#${id}` : `#${num}`;
}

function getProductFallback(order: any): string {
  return order.product_summary || order.upload?.file_name || `Order #${order.id}`;
}

function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

function getUploadedFileLabel(order: any): string | null {
  if (order.upload?.file_name) return order.upload.file_name;
  if (order.upload?.name) return order.upload.name;
  if (order.file?.file_name) return order.file.file_name;
  if (order.upload) return `Upload #${order.upload}`;
  return null;
}

export default function UnpricedQueue() {
  return (
    <Suspense fallback={null}>
      <UnpricedQueueInner />
    </Suspense>
  );
}

function UnpricedQueueInner() {
  const { t } = useTranslation(['common', 'unpricedQueue']);

  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingState>({ unitPrice: '', vatRate: '14', notes: '' });
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
        return [String(c.id), { name, email: c.email ?? '' }];
      }));

      const jobList: UnpricedJob[] = orders.map((order: any) => {
        const items = Array.isArray(order.item_details) ? order.item_details : [];
        const qty = items.length
          ? items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0)
          : order.quantity ?? order.item_count ?? 0;
        const deadlineIso = order.due_date ?? null;
        const mappedClient = clientsMap.get(String(order.customer));
        const clientName =
          order.customer_name ||
          mappedClient?.name ||
          order.customer_email ||
          'Unknown';

        return {
          id: String(order.id),
          displayId: getShortOrderId(order.id),
          client: clientName,
          clientEmail: order.customer_email || mappedClient?.email || 'Not provided',
          product: getProductFallback(order),
          items: items.map((item: any) => ({
            id: item.id,
            item_type: item.item_type || 'Item',
            quantity: Number(item.quantity) || 1,
            notes: item.notes ?? null,
            due_date: item.due_date ?? null,
            page_count: item.page_count ?? null,
            pages: item.pages ?? null,
            size: item.size ?? null,
            paper: item.paper ?? null,
            material: item.material ?? null,
            color_mode: item.color_mode ?? null,
            cover: item.cover ?? null,
            binding: item.binding ?? null,
            coil: item.coil ?? null,
          })),
          qty,
          deadline: formatDate(deadlineIso),
          dueDate: deadlineIso,
          createdAt: order.created_at ?? null,
          notes: order.notes ?? null,
          uploadLabel: getUploadedFileLabel(order),
        };
      });

      setJobs(jobList);
    } catch (err) {
      console.error('Failed to load unpriced queue:', err);
      setError(t('unpricedQueue:error'));
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

  const cancelOrder = async (job: UnpricedJob) => {
    const confirmed = window.confirm(`Cancel order ${job.displayId}? It will be removed from the unpriced queue.`);
    if (!confirmed) return;

    setCancellingId(job.id);
    setError(null);
    try {
      await updateOrder(Number(job.id), { status: 'CANCELLED' });
      if (pricingId === job.id) setPricingId(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError('Could not cancel this order. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const unitPrice = parseFloat(pricing.unitPrice) || 0;
  const vatRate = parseFloat(pricing.vatRate) / 100 || 0;

  const getSubtotal = (qty: number) => unitPrice * qty;
  const getVat = (qty: number) => getSubtotal(qty) * vatRate;
  const getTotal = (qty: number) => getSubtotal(qty) + getVat(qty);

  const submitPrice = async (job: UnpricedJob) => {
    if (!pricing.unitPrice || unitPrice <= 0) return;

    const total = getTotal(job.qty || 1);
    const quoteItems = job.items.length
      ? job.items.map((item) => {
          const itemQuantity = item.quantity || 1;
          return {
            item_type: item.item_type,
            quantity: itemQuantity,
            estimated_unit_price: unitPrice,
            estimated_total_price: getTotal(itemQuantity),
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
      setError(t('unpricedQueue:submitError'));
    } finally {
      setSubmittingId(null);
    }
  };

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
        if (Number.isNaN(createdAt.getTime())) return sum;
        return sum + Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / jobs.length
    : 0;

  const shell = (children: ReactNode) => (
    <AppShell role="owner" activePage="unpriced-queue">
      <Topbar title={t('unpricedQueue:title')} />
      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('unpricedQueue:stats.totalUnpriced')} value={jobs.length} sub={t('unpricedQueue:stats.totalSub')} />
        <StatCard label={t('unpricedQueue:stats.dueSoon')} value={dueSoon} sub={t('unpricedQueue:stats.dueSoonSub')} />
        <StatCard
          label={t('unpricedQueue:stats.overdue')}
          value={overdue}
          sub={overdue === 0 ? t('unpricedQueue:stats.overdueNone') : t('unpricedQueue:stats.overdueSome')}
        />
        <StatCard label={t('unpricedQueue:stats.avgProcessing')} value={`${averageProcessingDays.toFixed(1)}d`} sub={t('unpricedQueue:stats.avgSub')} />
      </section>
      {children}
    </AppShell>
  );

  if (loading) return shell(<div className="loading-state">{t('unpricedQueue:loading')}</div>);
  if (error) return shell(<div className="error-state">{error}</div>);

  return shell(
    <section className="table-wrap">
      <div className="table-head">
        <h3>{t('unpricedQueue:table.title')}</h3>
      </div>

      {jobs.length === 0 && (
        <p className="muted" style={{ padding: '20px 0' }}>{t('unpricedQueue:table.empty')}</p>
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
                  {t('unpricedQueue:job.badge')}
                </span>
              </div>
              <p style={{ marginBottom: 2 }}>
                <strong>{t('unpricedQueue:job.client')}:</strong> {j.client}
              </p>
              {j.items.length <= 1 ? (
                <p style={{ marginBottom: 2 }}>
                  <strong>{t('unpricedQueue:job.product')}:</strong>{' '}
                  {j.items[0]
                    ? `${j.items[0].item_type} (${t('unpricedQueue:job.pcs', { count: j.items[0].quantity })})`
                    : j.product}
                </p>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ marginBottom: 4 }}><strong>{t('unpricedQueue:job.products')}:</strong></p>
                  <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                    {j.items.map((item) => (
                      <li key={item.id}>
                        {item.item_type} - {t('unpricedQueue:job.pcs', { count: item.quantity })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ marginBottom: 2 }}>
                <strong>{t('unpricedQueue:job.quantity')}:</strong> {t('unpricedQueue:job.pcs', { count: j.qty })}
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>{t('unpricedQueue:job.deadline')}:</strong> {j.deadline}
              </p>

              <div className="card-actions">
                <button className={`btn${isOpen ? ' primary' : ''}`} onClick={() => openPricing(j.id)}>
                  {isOpen ? t('unpricedQueue:pricing.cancel') : t('unpricedQueue:pricing.priceThisJob')}
                </button>
                <button className="btn danger" onClick={() => cancelOrder(j)} disabled={cancellingId === j.id || submittingId === j.id}>
                  {cancellingId === j.id ? t('unpricedQueue:job.cancelling') : t('unpricedQueue:job.cancelOrder')}
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
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>
                    {t('unpricedQueue:pricing.panelTitle', { id: j.displayId })}
                  </h4>

                  {/* Order Details Table (from dev) */}
                  <div className="table-responsive" style={{ marginBottom: 14 }}>
                    <table className="orders-table">
                      <tbody>
                        <tr><th>{t('unpricedQueue:pricing.details.orderId')}</th><td>{j.displayId}</td><th>{t('unpricedQueue:pricing.details.client')}</th><td>{j.client}</td></tr>
                        <tr><th>{t('unpricedQueue:pricing.details.email')}</th><td>{j.clientEmail}</td><th>{t('unpricedQueue:pricing.details.dueDate')}</th><td>{j.deadline}</td></tr>
                        <tr><th>{t('unpricedQueue:pricing.details.uploadedFiles')}</th><td>{showValue(j.uploadLabel)}</td><th>{t('unpricedQueue:pricing.details.orderNotes')}</th><td>{showValue(j.notes)}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Items to Price Table (from dev) */}
                  <h4 style={{ marginBottom: 10, fontSize: 14 }}>{t('unpricedQueue:pricing.itemsToPrice')}</h4>
                  <div className="table-responsive" style={{ marginBottom: 16 }}>
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>{t('unpricedQueue:pricing.itemCols.product')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.qty')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.pages')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.size')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.paperMaterial')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.color')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.cover')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.bindingCoil')}</th>
                          <th>{t('unpricedQueue:pricing.itemCols.notes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {j.items.length ? j.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.item_type}</td>
                            <td>{item.quantity}</td>
                            <td>{showValue(item.page_count ?? item.pages)}</td>
                            <td>{showValue(item.size)}</td>
                            <td>{showValue(item.paper ?? item.material)}</td>
                            <td>{showValue(item.color_mode)}</td>
                            <td>{showValue(item.cover)}</td>
                            <td>{showValue(item.binding ?? item.coil)}</td>
                            <td>{showValue(item.notes)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td>{j.product}</td>
                            <td>{j.qty || 1}</td>
                            <td colSpan={7}>{t('unpricedQueue:pricing.notProvided')}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Set Price Section */}
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>
                    {t('unpricedQueue:pricing.setPrice', { id: j.displayId })}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>{t('unpricedQueue:pricing.unitPrice')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('unpricedQueue:pricing.unitPricePlaceholder')}
                        value={pricing.unitPrice}
                        onChange={(e) => setPricing((p) => ({ ...p, unitPrice: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>{t('unpricedQueue:pricing.vatRate')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder={t('unpricedQueue:pricing.vatPlaceholder')}
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
                        <span className="muted">
                          {t('unpricedQueue:pricing.subtotal', { qty: j.qty, price: fmt(unitPrice) })}
                        </span>
                        <span>EGP {fmt(getSubtotal(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">{t('unpricedQueue:pricing.vat', { rate: pricing.vatRate })}</span>
                        <span>EGP {fmt(getVat(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{t('unpricedQueue:pricing.total')}</span>
                        <span>EGP {fmt(getTotal(j.qty))}</span>
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>{t('unpricedQueue:pricing.notes')}</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, resize: 'vertical' }}
                      placeholder={t('unpricedQueue:pricing.notesPlaceholder')}
                      value={pricing.notes}
                      onChange={(e) => setPricing((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn primary"
                      disabled={!pricing.unitPrice || unitPrice <= 0 || submittingId === j.id || cancellingId === j.id}
                      onClick={() => submitPrice(j)}
                    >
                      {submittingId === j.id ? t('unpricedQueue:pricing.submitting') : t('unpricedQueue:pricing.submit')}
                    </button>
                    <button className="btn" onClick={() => setPricingId(null)} disabled={submittingId === j.id}>
                      {t('unpricedQueue:pricing.cancel')}
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
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import SearchFilter from '../../components/SearchFilter';
import ClientSummary from '../../components/ClientSummary';
import { downloadText } from '../../utils/download';
import { generateInvoice, getAccountingOverview, payInvoice } from '../../lib/api/invoicesService';

interface InvoiceItem {
  id: number;
  item_type: string;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
}

interface DisplayInvoice {
  id: string;
  order: string;
  client: string;
  total: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  totalAmountValue: number;
  paidAmountValue: number;
  remainingAmountValue: number;
  createdAt?: string;
  itemSummary: string;
  items: InvoiceItem[];
}

interface InvoiceCandidate {
  order_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  status?: string;
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLarge(num: number): string {
  if (num >= 1_000_000) return `EGP ${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `EGP ${(num / 1_000).toFixed(0)}K`;
  return `EGP ${num.toFixed(0)}`;
}

function getShortOrderId(orderId: number | string | null | undefined): string {
  if (orderId === null || orderId === undefined) return '-';
  return `#${orderId}`;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildInvoiceLines(invoice: DisplayInvoice): string[] {
  return [
    `Invoice: ${invoice.id}`,
    `Order: ${invoice.order}`,
    `Client: ${invoice.client}`,
    `Date: ${formatDate(invoice.createdAt)}`,
    `Items: ${invoice.itemSummary}`,
    `Total: ${invoice.total}`,
    `Paid: ${invoice.paidAmount}`,
    `Remaining: ${invoice.remainingAmount}`,
    `Payment status: ${invoice.status}`,
  ];
}

export default function Accounting() {
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<DisplayInvoice[]>([]);
  const [invoiceCandidates, setInvoiceCandidates] = useState<InvoiceCandidate[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string | number; sub: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<DisplayInvoice | null>(null);
  const [partialInvoice, setPartialInvoice] = useState<DisplayInvoice | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialError, setPartialError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const overviewRes = await getAccountingOverview();
      const overview = overviewRes.data.data;

      const displayList: DisplayInvoice[] = (overview.invoices ?? []).map((inv: any) => {
        const totalAmountValue = Number(inv.total ?? inv.total_amount ?? 0);
        const paidAmountValue = Number(inv.paid_amount ?? 0);
        const remainingAmountValue = Number(inv.remaining_amount ?? Math.max(totalAmountValue - paidAmountValue, 0));

        return {
          id: String(inv.id),
          order: getShortOrderId(inv.orderId ?? inv.order_id ?? inv.order),
          client: inv.client_name || 'Unknown',
          total: formatAmount(totalAmountValue),
          paidAmount: formatAmount(paidAmountValue),
          remainingAmount: formatAmount(remainingAmountValue),
          status: inv.payment_status || 'unpaid',
          totalAmountValue,
          paidAmountValue,
          remainingAmountValue,
          createdAt: inv.created_at,
          itemSummary: inv.item_summary || getShortOrderId(inv.orderId ?? inv.order_id ?? inv.order),
          items: inv.items ?? [],
        };
      });

      setStats([
        { label: 'Revenue Snapshot', value: formatLarge(overview.stats?.revenue_snapshot ?? 0), sub: 'Total paid amount' },
        { label: 'Pending Collection', value: formatLarge(overview.stats?.pending_collection ?? 0), sub: 'Remaining order amount' },
        { label: 'Paid Orders', value: overview.stats?.paid_orders ?? 0, sub: 'Orders fully paid' },
        { label: 'Unpaid Orders', value: overview.stats?.unpaid_orders ?? 0, sub: 'Need finance follow-up' },
      ]);

      setInvoices(displayList);
      setFilteredInvoices(displayList);
      setInvoiceCandidates(overview.invoice_candidates ?? []);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      setError('Could not load accounting data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (query: string, filter: string) => {
    let result = invoices;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(inv =>
        inv.id.toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        inv.order.toLowerCase().includes(q) ||
        inv.itemSummary.toLowerCase().includes(q)
      );
    }

    if (filter) {
      result = result.filter(inv => inv.status.toLowerCase() === filter.toLowerCase());
    }

    setFilteredInvoices(result);
  };

  const handleGenerateInvoice = async (orderId: number) => {
    setSavingId(`order-${orderId}`);
    try {
      await generateInvoice(orderId);
      await fetchData();
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      setError('Could not generate invoice for this order.');
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setSavingId(invoiceId);
    try {
      await payInvoice(invoiceId, { mark_full: true });
      await fetchData();
    } catch (err) {
      console.error('Failed to mark invoice paid:', err);
      setError('Could not mark invoice as paid.');
    } finally {
      setSavingId(null);
    }
  };

  const openPartialPayment = (invoice: DisplayInvoice) => {
    setPartialInvoice(invoice);
    setPartialAmount('');
    setPartialError(null);
  };

  const handlePartialPaymentSubmit = async () => {
    if (!partialInvoice) return;

    const amount = Number(partialAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPartialError('Enter an amount greater than 0.');
      return;
    }

    if (amount > partialInvoice.remainingAmountValue) {
      setPartialError('Amount cannot be greater than the remaining balance.');
      return;
    }

    setSavingId(partialInvoice.id);
    try {
      await payInvoice(partialInvoice.id, { amount, mark_full: false });
      setPartialInvoice(null);
      setPartialAmount('');
      await fetchData();
    } catch (err) {
      console.error('Failed to record partial payment:', err);
      setPartialError('Could not record partial payment.');
    } finally {
      setSavingId(null);
    }
  };

  const statsView = (
    <section className="grid-4">
      {stats.map((stat, idx) => (
        <StatCard key={idx} label={stat.label} value={stat.value} sub={stat.sub} />
      ))}
    </section>
  );

  if (loading) {
    return (
      <AppShell role="owner" activePage="accounting">
        <Topbar title="Accounting Page" />
        <section className="grid-4">
          <StatCard label="Revenue Snapshot" value="..." sub="Total paid amount" />
          <StatCard label="Pending Collection" value="..." sub="Remaining order amount" />
          <StatCard label="Paid Orders" value="..." sub="Orders fully paid" />
          <StatCard label="Unpaid Orders" value="..." sub="Need finance follow-up" />
        </section>
        <section className="table-wrap">
          <div className="loading-state">Loading accounting data...</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="accounting">
      <Topbar title="Accounting Page" />
      {statsView}

      {error && <div className="error-state" style={{ marginTop: 12 }}>{error}</div>}

      <ClientSummary invoices={invoices} />

      {invoiceCandidates.length > 0 && (
        <section className="table-wrap">
          <div className="table-head">
            <h3>Invoice-Ready Orders</h3>
          </div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client Name</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Order Status</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoiceCandidates.map((order) => (
                <tr key={order.order_id}>
                  <td>{getShortOrderId(order.order_id)}</td>
                  <td>{order.client_name}</td>
                  <td>{formatAmount(order.total)}</td>
                  <td>{formatAmount(order.paid_amount)}</td>
                  <td>{formatAmount(order.remaining_amount)}</td>
                  <td><StatusBadge status={order.status || 'CONFIRMED'} /></td>
                  <td><StatusBadge status={order.payment_status} /></td>
                  <td>
                    <button
                      className="btn"
                      disabled={savingId === `order-${order.order_id}`}
                      onClick={() => handleGenerateInvoice(order.order_id)}
                    >
                      {savingId === `order-${order.order_id}` ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoices</h3>
          <SearchFilter
            placeholder="Search by invoice, client, order..."
            filters={[
              { label: 'Paid', value: 'paid' },
              { label: 'Partial', value: 'partial' },
              { label: 'Unpaid', value: 'unpaid' },
            ]}
            onSearch={handleSearch}
          />
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Order</th>
              <th>Client Name</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan={9} className="no-results">No invoices found.</td></tr>
            ) : filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.order}</td>
                <td>{inv.client}</td>
                <td>{inv.itemSummary}</td>
                <td>{inv.total}</td>
                <td>{inv.paidAmount}</td>
                <td>{inv.remainingAmount}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => setPreviewInvoice(inv)}>
                    View
                  </button>
                  {inv.status !== 'paid' && (
                    <>
                      <button
                        className="btn"
                        disabled={savingId === inv.id}
                        onClick={() => openPartialPayment(inv)}
                      >
                        Record Partial Payment
                      </button>
                      <button
                        className="btn primary"
                        disabled={savingId === inv.id}
                        onClick={() => handleMarkPaid(inv.id)}
                      >
                        {savingId === inv.id ? 'Saving...' : 'Mark Paid'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previewInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: 18,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 620,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
            padding: 22,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Invoice Preview</h3>
              <button className="btn" onClick={() => setPreviewInvoice(null)}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><strong>Invoice #</strong><br />{previewInvoice.id}</div>
                <div><strong>Order</strong><br />{previewInvoice.order}</div>
                <div><strong>Client</strong><br />{previewInvoice.client}</div>
                <div><strong>Invoice Date</strong><br />{formatDate(previewInvoice.createdAt)}</div>
              </div>
              <div>
                <strong>Items</strong>
                <div style={{ marginTop: 6 }}>{previewInvoice.itemSummary}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><strong>Total</strong><br />{previewInvoice.total}</div>
                <div><strong>Paid</strong><br />{previewInvoice.paidAmount}</div>
                <div><strong>Remaining</strong><br />{previewInvoice.remainingAmount}</div>
              </div>
              <div><strong>Payment Status</strong><br /><StatusBadge status={previewInvoice.status} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                className="btn"
                onClick={() => downloadText(`invoice-${previewInvoice.id}.txt`, buildInvoiceLines(previewInvoice))}
              >
                Download
              </button>
              <button className="btn primary" onClick={() => setPreviewInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {partialInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: 18,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
            padding: 22,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Record Partial Payment</h3>
              <button className="btn" onClick={() => setPartialInvoice(null)}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><strong>Invoice #</strong><br />{partialInvoice.id}</div>
              <div><strong>Order</strong><br />{partialInvoice.order}</div>
              <div><strong>Client</strong><br />{partialInvoice.client}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><strong>Total</strong><br />{partialInvoice.total}</div>
                <div><strong>Paid</strong><br />{partialInvoice.paidAmount}</div>
                <div><strong>Remaining</strong><br />{partialInvoice.remainingAmount}</div>
              </div>
              <label className="form-group">
                <span>Payment Amount</span>
                <input
                  className="search-input"
                  style={{ width: '100%' }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={partialAmount}
                  onChange={(event) => {
                    setPartialAmount(event.target.value);
                    setPartialError(null);
                  }}
                  placeholder="Amount in EGP"
                />
              </label>
              {partialError && <div className="error-state" style={{ padding: 0 }}>{partialError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn" onClick={() => setPartialInvoice(null)}>Cancel</button>
              <button
                className="btn primary"
                disabled={savingId === partialInvoice.id}
                onClick={handlePartialPaymentSubmit}
              >
                {savingId === partialInvoice.id ? 'Saving...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

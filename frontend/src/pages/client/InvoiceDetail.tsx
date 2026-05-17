import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import './InvoiceDetail.css';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypass VITE_USE_MOCK
import { getInvoiceById, getClients } from '../../lib/api/invoicesClientsSettingsService';

// ─── Backend invoice shape (snake_case) ────────────────────────────
interface BackendInvoice {
  id: number;
  order_id: number | null;
  client_id: number | null;
  due_date: string;
  paid_date: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  notes: string | null;
}

interface DisplayInvoice {
  id: string;
  orderId: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  issued: string;
  due: string;
  paidDate: string | null;
  amount: number;
  status: string;
  vatRate: number;         // placeholder – not yet stored in DB
  items: LineItem[];       // placeholder – line items not yet stored
  notes: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

// ─── Helpers ───────────────────────────────────────────────────────
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatEGP(value: number): string {
  return value.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceDetail() {
  const { id: invoiceId = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [invoice, setInvoice] = useState<DisplayInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError('No invoice ID provided.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        // Fetch invoice and clients list in parallel
        const [invRes, clientsRes] = await Promise.all([
          getInvoiceById(invoiceId),
          getClients(),
        ]);

        const raw: BackendInvoice = invRes.data.data;
        const clients = clientsRes.data.data.results;

        console.log('InvoiceDetail - raw invoice:', raw);
        console.log('InvoiceDetail - clients:', clients);

        // Find the client associated with this invoice
        const client = clients.find(c => Number(c.id) === raw.client_id);
        const clientName = client?.name || 'Unknown';
        const clientAddress = client?.address || '—';
        const clientTaxId = client?.taxId || '—';

        const display: DisplayInvoice = {
          id: String(raw.id),
          orderId: raw.order_id ? `#${raw.order_id}` : '—',
          clientName,
          clientAddress,
          clientTaxId,
          issued: formatDate(raw.created_at),
          due: formatDate(raw.due_date),
          paidDate: formatDate(raw.paid_date),
          amount: raw.total_amount ?? 0,
          status: raw.status || '—',
          vatRate: 0.14,            // placeholder – not stored yet
          items: [],                // placeholder – no line items table yet
          notes: raw.notes || '',
        };

        setInvoice(display);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError('Could not load invoice details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handlePrint = () => window.print();
  const handleDownload = () => {
    if (!invoice) return;
    const sub = invoice.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const v = sub * invoice.vatRate;
    const tot = sub + v;
    downloadText(`invoice-${invoice.id}.txt`, [
      `INVOICE #${invoice.id}`,
      ``,
      `Billed To:   ${invoice.clientName}`,
      `Address:     ${invoice.clientAddress}`,
      `Tax ID:      ${invoice.clientTaxId}`,
      ``,
      `Linked Order: ${invoice.orderId}`,
      `Issue Date:   ${invoice.issued}`,
      `Due Date:     ${invoice.due}`,
      invoice.paidDate ? `Payment Date: ${invoice.paidDate}` : '',
      ``,
      `Items:`,
      ...invoice.items.map(item =>
        `  ${item.description.padEnd(30)} x${item.quantity}  @ EGP ${item.unitPrice.toFixed(2)}  =  EGP ${(item.quantity * item.unitPrice).toFixed(2)}`
      ),
      ``,
      `Subtotal: EGP ${sub.toFixed(2)}`,
      `VAT (${(invoice.vatRate * 100).toFixed(0)}%): EGP ${v.toFixed(2)}`,
      `Total:    EGP ${tot.toFixed(2)}`,
      `Status:   ${invoice.status}`,
    ].filter(l => l !== undefined));
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title="Invoice Detail" />
        <section className="table-wrap">
          <div className="loading-state">Loading invoice...</div>
        </section>
      </AppShell>
    );
  }

  if (error || !invoice) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title="Invoice Detail" />
        <section className="table-wrap">
          <div className="error-state">{error || 'Invoice not found.'}</div>
        </section>
      </AppShell>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = subtotal * invoice.vatRate;
  const total = subtotal + vat;

  return (
    <AppShell role="client" activePage="client-invoices">
      <Topbar title="Invoice Detail" onBack={goBack} backLabel="Invoices" />

      <section className="table-wrap">
        <div className={`box invoice-detail-card${invoice.status === 'overdue' ? ' overdue' : ''}`}>
          {/* Header */}
          <div className="invoice-header">
            <div>
              <div className="invoice-brand">DistroHub</div>
              <h2 className="invoice-id">Invoice #{invoice.id}</h2>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          {/* Meta grid */}
          <div className="invoice-meta-grid">
            <div className="invoice-meta-col">
              <p className="meta-section-label">Billed to</p>
              <p className="meta-value-primary">{invoice.clientName}</p>
              <p className="meta-field-label">Address</p>
              <p className="meta-value">{invoice.clientAddress}</p>
              <p className="meta-field-label">Tax ID</p>
              <p className="meta-value">{invoice.clientTaxId}</p>
            </div>
            <div className="invoice-meta-col">
              <p className="meta-section-label">Invoice details</p>
              <p className="meta-field-label">Linked order</p>
              <p className="meta-value">{invoice.orderId}</p>
              <p className="meta-field-label">Issue date</p>
              <p className="meta-value">{invoice.issued}</p>
              <p className="meta-field-label">Due date</p>
              <p className="meta-value">{invoice.due}</p>
              {invoice.paidDate && (
                <>
                  <p className="meta-field-label">Payment date</p>
                  <p className="meta-value">{invoice.paidDate}</p>
                </>
              )}
            </div>
          </div>

          {/* Line items table — placeholder until backend stores items */}
          <div className="table-responsive">
            <table className="orders-table invoice-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit price (EGP)</th>
                  <th style={{ textAlign: 'right' }}>Total (EGP)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '12px', color: 'var(--muted)' }}>Line items not available yet</td></tr>
                ) : (
                  invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatEGP(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{formatEGP(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span className="total-label">Subtotal</span>
              <span className="total-value">{formatEGP(subtotal)}</span>
            </div>
            <div className="invoice-total-row">
              <span className="total-label">VAT ({(invoice.vatRate * 100).toFixed(0)}%)</span>
              <span className="total-value">{formatEGP(vat)}</span>
            </div>
            <div className="invoice-total-row invoice-grand-total">
              <span className="total-label">Total</span>
              <span className="total-value">{formatEGP(total)} EGP</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="invoice-note">{invoice.notes}</div>
          )}

          {/* Actions */}
          <div className="invoice-actions">
            {invoice.status !== 'paid' && !paid && (
              <button className="btn primary" onClick={() => setPaying(true)}>Pay Now</button>
            )}
            {paid && <span style={{ color: '#2c9a4b', fontWeight: 600, fontSize: 14 }}>✓ Payment confirmed</span>}
            <button className="btn" onClick={handlePrint}>Print</button>
            <button className="btn btn-outline" onClick={handleDownload}>Download PDF</button>
          </div>

          {paying && !paid && (
            <div style={{ marginTop: 20, padding: 20, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: 16 }}>Payment Details</h4>
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Card Number</label>
                <input className="input" placeholder="1234 5678 9012 3456" maxLength={19} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Expiry</label>
                  <input className="input" placeholder="MM / YY" maxLength={7} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CVV</label>
                  <input className="input" placeholder="•••" maxLength={4} type="password" />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Cardholder Name</label>
                <input className="input" placeholder="Name on card" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={() => { setPaid(true); setPaying(false); }}>Confirm Payment</button>
                <button className="btn" onClick={() => setPaying(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <section className="box" style={{ marginTop: 14, maxWidth: 860, margin: '14px auto 0' }}>
          <div className="table-head">
            <p><strong>Issue with this invoice?</strong> Our support team is here to help.</p>
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
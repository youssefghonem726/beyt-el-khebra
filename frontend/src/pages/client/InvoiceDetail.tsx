import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import './InvoiceDetail.css';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceDetail {
  id: string;
  order: string;
  issued: string;
  due: string;
  paidDate?: string;
  amount: string;
  status: string;
  billedTo: {
    name: string;
    address: string;
    taxId: string;
  };
  items: LineItem[];
  vatRate: number;
  notes?: string;
}

function formatEGP(value: number): string {
  return value.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceDetail() {
  const { id: invoiceId = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch('/data/client-invoices-detail.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: InvoiceDetail[]) => {
        const found = data.find((inv) => inv.id === invoiceId);
        if (!found) throw new Error('Invoice not found.');
        setInvoice(found);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load invoice detail:', err);
        setError('Could not load this invoice. Please try again later.');
        setLoading(false);
      });
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
      `Billed To:   ${invoice.billedTo.name}`,
      `Address:     ${invoice.billedTo.address}`,
      `Tax ID:      ${invoice.billedTo.taxId}`,
      ``,
      `Linked Order: ${invoice.order}`,
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
          <div className="error-state">{error ?? 'Invoice not found.'}</div>
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
        <div className={`box invoice-detail-card${invoice.status === 'Overdue' ? ' overdue' : ''}`}>
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
              <p className="meta-value-primary">{invoice.billedTo.name}</p>
              <p className="meta-field-label">Address</p>
              <p className="meta-value">{invoice.billedTo.address}</p>
              <p className="meta-field-label">Tax ID</p>
              <p className="meta-value">{invoice.billedTo.taxId}</p>
            </div>
            <div className="invoice-meta-col">
              <p className="meta-section-label">Invoice details</p>
              <p className="meta-field-label">Linked order</p>
              <p className="meta-value">{invoice.order}</p>
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

          {/* Line items table */}
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
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatEGP(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right' }}>{formatEGP(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
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
            {invoice.status !== 'Paid' && !paid && (
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
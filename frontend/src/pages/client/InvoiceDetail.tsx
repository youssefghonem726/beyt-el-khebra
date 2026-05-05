import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props {
  onNavigate: (page: string) => void;
  invoiceId: string;
}

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

export default function InvoiceDetail({ onNavigate, invoiceId }: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    alert('PDF download coming soon.');
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
        <Topbar title="Invoice Detail" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="loading-state">Loading invoice...</div>
        </section>
      </AppShell>
    );
  }

  if (error || !invoice) {
    return (
      <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
        <Topbar title="Invoice Detail" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="error-state">{error ?? 'Invoice not found.'}</div>
          <button className="btn primary" onClick={() => onNavigate('client-invoices')} style={{ marginTop: 16 }}>
            Back to Invoices
          </button>
        </section>
      </AppShell>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = subtotal * invoice.vatRate;
  const total = subtotal + vat;

  return (
    <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
      <Topbar title="Invoice Detail" userName="Ahmed Store" />

      <section className="table-wrap">
        {/* Back button */}
        <button
          className="btn btn-sm"
          style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => onNavigate('client-invoices')}
        >
          ← Back to Invoices
        </button>

        <div className="box invoice-detail-card">
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
            {invoice.status !== 'Paid' && (
              <button className="btn primary">Pay Now</button>
            )}
            <button className="btn" onClick={handlePrint}>Print</button>
            <button className="btn btn-outline" onClick={handleDownload}>Download PDF</button>
          </div>
        </div>

        {/* Support nudge */}
        <section className="box" style={{ marginTop: 14 }}>
          <div className="table-head">
            <p><strong>Issue with this invoice?</strong> Our support team is here to help.</p>
            <button className="btn primary" onClick={() => onNavigate('support')}>Contact Support</button>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

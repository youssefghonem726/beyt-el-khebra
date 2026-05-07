import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface Props {
  quoteId: string;
}

interface LineItem { description: string; qty: number; unitPrice: number; }

interface QuoteData {
  id: string; order: string; status: string; vatRate: number;
  items: LineItem[]; notes: string; validUntil?: string; invoicePage?: string;
}

const QUOTE_DATA: Record<string, QuoteData> = {
  'Q-211': {
    id: 'Q-211', order: '#1021', status: 'Awaiting Confirmation', vatRate: 0.14,
    validUntil: '28 Apr 2025',
    items: [
      { description: 'Business Cards (Matte 350gsm) – 500 pcs', qty: 500, unitPrice: 1.80 },
      { description: 'Glossy Finish Coating',                    qty: 1,   unitPrice: 200  },
      { description: 'Delivery & Handling',                      qty: 1,   unitPrice: 150  },
    ],
    notes: 'Quote valid until 28 Apr 2025. Confirm to start production.',
  },
  'Q-208': {
    id: 'Q-208', order: '#1018', status: 'Approved', vatRate: 0.14,
    invoicePage: 'invoice-detail-INV-9018',
    items: [
      { description: 'Flyers A5 (Glossy 150gsm) – 200 pcs', qty: 200, unitPrice: 3.50 },
      { description: 'Delivery & Handling',                   qty: 1,   unitPrice: 100  },
    ],
    notes: 'Quote approved. Invoice INV-9018 has been issued.',
  },
};

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuoteDetail({ quoteId }: Props) {
  const { navigateTopLevel } = useNavigation();
  const quote = QUOTE_DATA[quoteId];

  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  if (!quote) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar title="Quote Detail" />
        <section className="table-wrap"><div className="error-state">Quote not found.</div></section>
      </AppShell>
    );
  }

  const subtotal = quote.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = subtotal * quote.vatRate;
  const total = subtotal + vat;

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar title={`Quote ${quote.id}`} />

      <div className="box invoice-detail-card" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="invoice-header">
          <div>
            <div className="invoice-brand">Bayt El Khebra</div>
            <h2 className="invoice-id">Quote {quote.id}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>For order {quote.order}</p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        {quote.validUntil && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            Valid until: <strong>{quote.validUntil}</strong>
          </p>
        )}

        <div className="table-responsive">
          <table className="orders-table invoice-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price (EGP)</th>
                <th style={{ textAlign: 'right' }}>Total (EGP)</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.qty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span className="total-label">Subtotal</span>
            <span className="total-value">{fmt(subtotal)}</span>
          </div>
          <div className="invoice-total-row">
            <span className="total-label">VAT ({(quote.vatRate * 100).toFixed(0)}%)</span>
            <span className="total-value">{fmt(vat)}</span>
          </div>
          <div className="invoice-total-row invoice-grand-total">
            <span className="total-label">Total</span>
            <span className="total-value">{fmt(total)} EGP</span>
          </div>
        </div>

        {quote.notes && <div className="invoice-note" style={{ marginTop: 20 }}>{quote.notes}</div>}

        {/* ── Confirmed success banner ── */}
        {confirmed && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, color: '#065f46' }}>
            <strong>Quote confirmed!</strong> Your order is now being sent to production. We'll notify you once it starts.
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => navigateTopLevel('my-orders')}>View My Orders</button>
            </div>
          </div>
        )}

        {/* ── Request changes success banner ── */}
        {requestSent && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 10, color: '#1e40af' }}>
            <strong>Request sent!</strong> Our team will review your changes and get back to you shortly.
          </div>
        )}

        {/* ── Awaiting confirmation actions ── */}
        {quote.status === 'Awaiting Confirmation' && !confirmed && !requestSent && (
          <>
            {/* Confirm step */}
            {!confirming && !requestOpen && (
              <div className="invoice-actions">
                <button className="btn primary" onClick={() => setConfirming(true)}>
                  Confirm Quote
                </button>
                <button className="btn" onClick={() => setRequestOpen(true)}>
                  Request Changes
                </button>
              </div>
            )}

            {confirming && (
              <div style={{ marginTop: 20, padding: '16px 20px', background: '#fef9ec', border: '1px solid #fcd34d', borderRadius: 10 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>Are you sure you want to confirm this quote?</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                  Confirming will lock in the pricing and send the order to production. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn primary" onClick={() => { setConfirmed(true); setConfirming(false); }}>
                    Yes, Confirm
                  </button>
                  <button className="btn" onClick={() => setConfirming(false)}>Cancel</button>
                </div>
              </div>
            )}

            {requestOpen && (
              <div style={{ marginTop: 20, padding: '16px 20px', background: '#f8f9fb', border: '1px solid var(--border)', borderRadius: 10 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>What changes would you like to request?</p>
                <textarea
                  className="input"
                  style={{ width: '100%', minHeight: 100, resize: 'vertical', marginBottom: 12 }}
                  placeholder="Describe the changes you'd like (e.g. different quantity, paper type, size…)"
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn primary"
                    disabled={!requestMsg.trim()}
                    onClick={() => { setRequestSent(true); setRequestOpen(false); }}
                  >
                    Send Request
                  </button>
                  <button className="btn" onClick={() => { setRequestOpen(false); setRequestMsg(''); }}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Approved actions ── */}
        {quote.status === 'Approved' && quote.invoicePage && (
          <div className="invoice-actions">
            <button className="btn primary" onClick={() => navigateTopLevel(quote.invoicePage!)}>
              View Invoice
            </button>
            <button className="btn" onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
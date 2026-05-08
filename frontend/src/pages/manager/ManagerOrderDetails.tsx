import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface OrderData {
  client: string; batch: string; product: string; status: string;
  qty: number; deadline: string; step: string; progress: number;
  type: 'pending' | 'completed';
  invoiceId?: string;
}

interface InvoiceData {
  id: string; issued: string; due: string; paidDate?: string; status: string;
  billedTo: { name: string; address: string; taxId: string };
  items: { description: string; quantity: number; unitPrice: number }[];
  vatRate: number; notes?: string;
}

const ORDER_DATA: Record<string, OrderData> = {
  '1033': { client: 'Client Name', batch: 'B-260426-P', product: 'Packaging Sleeves', status: 'UNPRICED',         qty: 2500, deadline: '30 Apr 2026', step: 'File review',   progress: 10,  type: 'pending'   },
  '1031': { client: 'Design Hub',  batch: 'B-260425-D', product: 'Brochures',          status: 'PENDING APPROVAL', qty: 500,  deadline: '27 Apr 2026', step: 'Awaiting quote', progress: 0,   type: 'pending'   },
  '1024': { client: 'Client Name', batch: 'B-260423-C', product: 'Business Cards',     status: 'COMPLETED',        qty: 1000, deadline: '26 Apr 2026', step: 'Done',          progress: 100, type: 'completed', invoiceId: 'INV-1024' },
  '1020': { client: 'Ahmed Store', batch: 'B-260420-A', product: 'Flyers',             status: 'COMPLETED',        qty: 200,  deadline: '26 Apr 2026', step: 'Done',          progress: 100, type: 'completed', invoiceId: 'INV-1020' },
};

const INVOICE_DATA: Record<string, InvoiceData> = {
  'INV-1024': {
    id: 'INV-1024', issued: '26 Apr 2026', due: '3 May 2026', paidDate: '26 Apr 2026', status: 'Paid',
    billedTo: { name: 'Client Name', address: '45 El Hegaz St, Heliopolis, Cairo', taxId: 'TAX-20045' },
    items: [
      { description: 'Business Cards (Matte 350gsm) — 1000 pcs', quantity: 1000, unitPrice: 1.20 },
    ],
    vatRate: 0.14,
    notes: 'Payment received on 26 Apr 2026. Thank you for your business.',
  },
  'INV-1020': {
    id: 'INV-1020', issued: '26 Apr 2026', due: '3 May 2026', paidDate: '26 Apr 2026', status: 'Paid',
    billedTo: { name: 'Ahmed Store', address: '12 El Nasr St, Cairo, Egypt', taxId: 'TAX-10023' },
    items: [
      { description: 'Flyers A5 (Glossy 150gsm, Full Colour) — 200 pcs', quantity: 200, unitPrice: 2.10 },
    ],
    vatRate: 0.14,
    notes: 'Payment received on 26 Apr 2026. Thank you for your business.',
  },
};

function fmt(n: number) { return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ManagerOrderDetails() {
  const { id: orderId = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [sentToAccounting, setSentToAccounting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const order = orderId ? ORDER_DATA[orderId] : null;
  const invoice = order?.invoiceId ? INVOICE_DATA[order.invoiceId] : null;

  if (!order) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title="Order Details" />
        <div className="error-state">Order not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={`Order Details #${orderId}`} onBack={goBack} backLabel="Orders" />
      <section className="order-layout">
        <article className="stack">
          <section className="box">
            <h3>Order Overview</h3>
            <div className="spec-grid">
              <p>Client       <span>{order.client}</span></p>
              <p>Batch Code   <span>{order.batch}</span></p>
              <p>Product      <span>{order.product}</span></p>
              <p>Status       <span><StatusBadge status={order.status} /></span></p>
              <p>Quantity     <span>{order.qty}</span></p>
              <p>Deadline     <span>{order.deadline}</span></p>
            </div>
          </section>

          <section className="box">
            <h3>Production Progress</h3>
            <p><strong>Current Step:</strong> {order.step}</p>
            <ProgressBar percent={order.progress} style={{ marginTop: 10 }} />
            {order.type === 'completed' && (
              <p style={{ marginTop: 10, color: '#2c9a4b', fontWeight: 600 }}>All stages complete.</p>
            )}
            {order.type === 'pending' && (
              <ul style={{ marginTop: 10, fontSize: 13 }}>
                <li>Prepress: Pending</li>
                <li>Printing: Not started</li>
                <li>Finishing: Not started</li>
                <li>QC: Not started</li>
              </ul>
            )}
          </section>
        </article>

        <aside className="box">
          <h3>Manager Actions</h3>
          {order.type === 'pending' && (
            <>
              <button className="btn primary block" onClick={() => navigateTopLevel(`/manager/orders/edit/${orderId}`)}>
                Edit Order
              </button>
              {sentToAccounting ? (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0faf4', border: '1px solid #a8ddb5', borderRadius: 8, fontSize: 13, color: '#2c7a4b' }}>
                  Order <strong>#{orderId}</strong> has been forwarded to the accounting team for invoicing.
                </div>
              ) : (
                <button
                  className="btn block"
                  style={{ marginTop: 8 }}
                  onClick={() => setSentToAccounting(true)}
                >
                  Send to Accounting
                </button>
              )}
            </>
          )}
          {order.type === 'completed' && (
            <>
              <button className="btn primary block" onClick={() => setShowInvoice(true)}>
                View Invoice
              </button>
              {sentToAccounting ? (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0faf4', border: '1px solid #a8ddb5', borderRadius: 8, fontSize: 13, color: '#2c7a4b' }}>
                  Invoice for order <strong>#{orderId}</strong> has been sent to the accounting team.
                </div>
              ) : (
                <button className="btn block" style={{ marginTop: 8 }} onClick={() => setSentToAccounting(true)}>
                  Send to Accounting
                </button>
              )}
              <button className="btn block" style={{ marginTop: 8 }} onClick={() => navigateTopLevel('delivery-list')}>
                View Delivery
              </button>
            </>
          )}
        </aside>
      </section>
      {showInvoice && invoice && (() => {
        const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const vat = subtotal * invoice.vatRate;
        const total = subtotal + vat;
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowInvoice(false); }}
          >
            <div style={{ background: 'var(--surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 640, boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border, #e4e6eb)', position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 1 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Invoice {invoice.id}</h2>
                <button onClick={() => setShowInvoice(false)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✕ Close</button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Linked Order: #{orderId}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Issue Date: {invoice.issued}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Due Date: {invoice.due}</p>
                    {invoice.paidDate && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Paid: {invoice.paidDate}</p>}
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>

                <div className="line" />

                <h4 style={{ margin: '12px 0 8px' }}>Billed To</h4>
                <p style={{ fontSize: 13 }}><strong>{invoice.billedTo.name}</strong></p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{invoice.billedTo.address}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Tax ID: {invoice.billedTo.taxId}</p>

                <div className="line" />

                <h4 style={{ margin: '12px 0 8px' }}>Line Items</h4>
                <table style={{ marginBottom: 14 }}>
                  <thead>
                    <tr><th>Description</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit (EGP)</th><th style={{ textAlign: 'right' }}>Total (EGP)</th></tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.description}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'grid', gap: 4, fontSize: 13, textAlign: 'right', marginBottom: 12 }}>
                  <p>Subtotal: <strong>EGP {fmt(subtotal)}</strong></p>
                  <p>VAT ({(invoice.vatRate * 100).toFixed(0)}%): <strong>EGP {fmt(vat)}</strong></p>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>Total: EGP {fmt(total)}</p>
                </div>

                {invoice.notes && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border, #e4e6eb)', paddingTop: 10 }}>{invoice.notes}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
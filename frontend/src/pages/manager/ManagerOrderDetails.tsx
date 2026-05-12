import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

interface Order {
  id: string;
  clientId: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number | null;
  paid: number | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  specs: Record<string, any>;
}

interface Batch {
  id: string;
  orderId: string;
  clientId: string;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo: string | null;
  deadline: string | null;
  status: string;
  stages: Array<{ stage: string; status: string; updatedAt: string | null }>;
  notes: string;
}

interface Invoice {
  id: string;
  orderId: string;
  clientId: string;
  issued: string;
  due: string;
  paidDate: string | null;
  amount: number;
  status: string;
  vatRate: number;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes: string;
}

interface Client {
  id: string;
  name: string;
  address: string;
  taxId: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmt(n: number): string {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ManagerOrderDetails() {
  const { id: orderIdParam = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();
  const [sentToAccounting, setSentToAccounting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [order, setOrder] = useState<Order | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderIdParam) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/invoices.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, invoicesData, clientsData]) => {
        const orders: Order[] = ordersData;
        const batches: Batch[] = batchesData;
        const invoices: Invoice[] = invoicesData;
        const clients: Client[] = clientsData;

        // Find order: try full ID first, then try by numeric suffix
        let foundOrder = orders.find(o => o.id === orderIdParam);
        if (!foundOrder) {
          // Try to match orders where the ID contains "-{orderIdParam}-"
          const numericPattern = new RegExp(`-${orderIdParam}-`);
          foundOrder = orders.find(o => numericPattern.test(o.id));
        }
        if (!foundOrder) {
          setError(`Order ${orderIdParam} not found.`);
          setLoading(false);
          return;
        }

        const foundBatch = batches.find(b => b.orderId === foundOrder!.id) || null;
        const foundInvoice = foundOrder!.invoiceId ? invoices.find(i => i.id === foundOrder!.invoiceId) : null;
        const foundClient = clients.find(c => c.id === foundOrder!.clientId) || null;

        setOrder(foundOrder);
        setBatch(foundBatch);
        setInvoice(foundInvoice || null);
        setClient(foundClient);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load order details:', err);
        setError('Could not load order details. Please try again later.');
        setLoading(false);
      });
  }, [orderIdParam]);

  if (loading) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title="Order Details" />
        <div className="loading-state">Loading order details...</div>
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title="Order Details" />
        <div className="error-state">{error || 'Order not found.'}</div>
      </AppShell>
    );
  }

  // Derived values
  const qty = batch?.qty || order.specs?.qty || 0;
  const progress = batch ? Math.round((batch.progress / batch.qty) * 100) : 0;
  const deadline = batch?.deadline ? formatDate(batch.deadline) : '—';
  const stepLabel = batch?.stages?.find(s => s.status !== 'done')?.stage || (order.status === 'completed' ? 'Done' : 'In progress');
  const isCompleted = order.status === 'completed' || order.status === 'canceled';

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={`Order Details #${orderIdParam}`} onBack={goBack} backLabel="Orders" />
      <section className="order-layout">
        <article className="stack">
          <section className="box">
            <h3>Order Overview</h3>
            <div className="spec-grid">
              <p>Client       <span>{client?.name || 'Unknown'}</span></p>
              <p>Batch Code   <span>{batch?.id || '—'}</span></p>
              <p>Product      <span>{order.product}</span></p>
              <p>Status       <span><StatusBadge status={order.status} /></span></p>
              <p>Quantity     <span>{qty}</span></p>
              <p>Deadline     <span>{deadline}</span></p>
            </div>
          </section>

          <section className="box">
            <h3>Production Progress</h3>
            <p><strong>Current Step:</strong> {stepLabel}</p>
            <ProgressBar percent={progress} style={{ marginTop: 10 }} />
            {isCompleted && (
              <p style={{ marginTop: 10, color: '#2c9a4b', fontWeight: 600 }}>Order completed.</p>
            )}
            {!isCompleted && batch?.stages && batch.stages.length > 0 && (
              <ul style={{ marginTop: 10, fontSize: 13 }}>
                {batch.stages.map(s => (
                  <li key={s.stage}>{s.stage}: {s.status}</li>
                ))}
              </ul>
            )}
          </section>
        </article>

        <aside className="box">
          <h3>Manager Actions</h3>
          {!isCompleted ? (
            <>
              <button className="btn primary block" onClick={() => navigateTopLevel(`/manager/orders/edit/${order.id}`)}>
                Edit Order
              </button>
              {sentToAccounting ? (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0faf4', border: '1px solid #a8ddb5', borderRadius: 8, fontSize: 13, color: '#2c7a4b' }}>
                  Order <strong>#{orderIdParam}</strong> has been forwarded to the accounting team for invoicing.
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
          ) : (
            <>
              {order.invoiceId && (
                <button className="btn primary block" onClick={() => setShowInvoice(true)}>
                  View Invoice
                </button>
              )}
              {sentToAccounting ? (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0faf4', border: '1px solid #a8ddb5', borderRadius: 8, fontSize: 13, color: '#2c7a4b' }}>
                  Invoice for order <strong>#{orderIdParam}</strong> has been sent to the accounting team.
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
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Linked Order: {order.id}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Issue Date: {formatDate(invoice.issued)}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Due Date: {formatDate(invoice.due)}</p>
                    {invoice.paidDate && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Paid: {formatDate(invoice.paidDate)}</p>}
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>

                <div className="line" />

                <h4 style={{ margin: '12px 0 8px' }}>Billed To</h4>
                <p style={{ fontSize: 13 }}><strong>{client?.name || 'Unknown'}</strong></p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{client?.address || '—'}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Tax ID: {client?.taxId || '—'}</p>

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
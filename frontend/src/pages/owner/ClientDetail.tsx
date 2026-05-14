import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import DocumentSection from '../../components/DocumentSection';

// Types for normalized JSON files
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  since: string | null;          // ISO date string
  stats: {
    totalOrders: number;
    totalSpent: number;
  };
}

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

interface PricingRow {
  id: string;
  product: string;
  size: string;
  paper: string;
  pricePerUnit: number;
  minQty: number;
  active: boolean;
}

// Helper: format date to "DD MMM YYYY"
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Helper: format amount to EGP string
function formatAmount(amount: number | null): string {
  if (amount === null) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper: extract short order number (e.g., "#1021" from "ORD-1021-2025")
function getShortOrderId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

// Helper: compute "Customer Since" string from ISO date
function formatCustomerSince(since: string | null): string {
  if (!since) return '—';
  const start = new Date(since);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0) {
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  }
  return `${months} month${months !== 1 ? 's' : ''}`;
}

// Helper: compute average order price from totalSpent and totalOrders
function getAverageOrderPrice(totalSpent: number, totalOrders: number): string {
  if (totalOrders === 0) return 'EGP 0';
  const avg = totalSpent / totalOrders;
  return `EGP ${avg.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper: format currency for stats
function formatStatsAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientDetail() {
  const { id: clientId = 'CL-001' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pricing edit local state (mock – no persistence)
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editMinQty, setEditMinQty] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/clients.json').then(res => {
        if (!res.ok) throw new Error('Failed to load clients');
        return res.json();
      }),
      fetch('/data/json/orders.json').then(res => {
        if (!res.ok) throw new Error('Failed to load orders');
        return res.json();
      }),
      fetch('/data/json/pricing.json').then(res => {
        if (!res.ok) throw new Error('Failed to load pricing');
        return res.json();
      })
    ])
      .then(([clientsData, ordersData, pricingData]) => {
        const clients: Client[] = clientsData;
        const allOrders: Order[] = ordersData;
        const basePricing: PricingRow[] = pricingData;

        const foundClient = clients.find(c => c.id === clientId);
        if (!foundClient) {
          setError(`Client with ID "${clientId}" not found.`);
          setLoading(false);
          return;
        }

        const clientOrders = allOrders.filter(o => o.clientId === clientId);
        setClient(foundClient);
        setOrders(clientOrders);
        setPricing(basePricing);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError('Could not load client data. Please try again later.');
        setLoading(false);
      });
  }, [clientId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Pricing edit handlers (local only)
  const startEdit = (row: PricingRow) => {
    setEditId(row.id);
    setEditPrice(String(row.pricePerUnit));
    setEditMinQty(String(row.minQty));
  };

  const saveEdit = (rowId: string) => {
    const price = parseFloat(editPrice);
    const qty = parseInt(editMinQty, 10);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) return;
    setPricing(ps => ps.map(p => p.id === rowId ? { ...p, pricePerUnit: price, minQty: qty } : p));
    setEditId(null);
    setToast('Price updated (local only).');
  };

  const toggleActive = (rowId: string) => {
    setPricing(ps => ps.map(p => p.id === rowId ? { ...p, active: !p.active } : p));
  };

  // Loading / error states
  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar"><h1>Client Details</h1></header>
        <section className="box"><div className="loading-state">Loading client details...</div></section>
      </AppShell>
    );
  }

  if (error || !client) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar"><h1>Client Details</h1></header>
        <section className="box"><div className="error-state">{error || 'Client data unavailable.'}</div></section>
      </AppShell>
    );
  }

  // Compute stats from clientOrders
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrderPrice = getAverageOrderPrice(totalSpent, totalOrders);
  const customerSince = formatCustomerSince(client.since);
  const totalSpentFormatted = formatStatsAmount(totalSpent);

  const stats = [
    { label: 'Total Number of Orders', value: totalOrders.toString() },
    { label: 'Average Order Price', value: avgOrderPrice },
    { label: 'Customer Since', value: customerSince },
    { label: 'Total Amount Spent', value: totalSpentFormatted },
  ];

  // Past orders display
  const pastOrders = orders.map(order => ({
    id: getShortOrderId(order.id),
    product: order.product,
    status: order.status,
    date: formatDate(order.orderDate),
    total: formatAmount(order.total),
  }));

  return (
    <AppShell role="owner" activePage="client-management">
      <header className="topbar">
        <h1>Client Details - {client.name}</h1>
        <button className="btn" onClick={() => navigateTopLevel('client-management')}>
          Back to Client Management
        </button>
      </header>

      {/* Info & Stats */}
      <section className="box">
        <div className="form-grid-2">
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Phone Number:</strong> {client.phone}</p>
          <p><strong>Address:</strong> {client.address || '—'}</p>
          <p><strong>Email:</strong> {client.email}</p>
        </div>
        <div className="line" />
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.label} className="stat-item">
              <p>{s.label}</p>
              <h4>{s.value}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Documents</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Click a document to expand its preview. Rename, download, or remove files below.
          </p>
        </div>
        <DocumentSection clientId={client.id} />
      </section>

      {/* Client Pricing (base pricing + local edits) */}
      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Client Pricing</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Standard pricing table. Edits are local only.
          </p>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Paper / Material</th>
              <th style={{ textAlign: 'right' }}>Price / Unit (EGP)</th>
              <th style={{ textAlign: 'center' }}>Min Qty</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map(row => (
              <tr key={row.id} style={{ opacity: row.active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{row.product}</td>
                <td>{row.size}</td>
                <td>{row.paper}</td>

                {editId === row.id ? (
                  <>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        style={{ width: 90, textAlign: 'right', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={editMinQty}
                        onChange={e => setEditMinQty(e.target.value)}
                        style={{ width: 70, textAlign: 'center', padding: '4px 8px' }}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(row.pricePerUnit)}</td>
                    <td style={{ textAlign: 'center' }}>{row.minQty}</td>
                  </>
                )}

                <td style={{ textAlign: 'center' }}>
                  <span
                    className={`status ${row.active ? 'done' : 'canceled'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleActive(row.id)}
                    title="Click to toggle"
                  >
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td style={{ textAlign: 'center' }}>
                  {editId === row.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        className="btn primary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => saveEdit(row.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Past Orders */}
      <section className="table-wrap" style={{ marginTop: 14 }}>
        <h3>Past Orders</h3>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pastOrders.length === 0 ? (
              <tr><td colSpan={5} className="no-results">No past orders</td></tr>
            ) : (
              pastOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.product}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2f3640', color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}
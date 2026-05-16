import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import DocumentSection from '../../components/DocumentSection';
// Direct service imports
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import { getPricingByUser, updatePricing } from '../../lib/api/pricingService';
import type { Client } from '../../lib/api/invoicesClientsSettingsService';
import type { PricingRow } from '../../lib/api/pricingService';

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount: number | null): string {
  if (amount === null) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCustomerSince(since: string | null): string {
  if (!since) return '—';
  const start = new Date(since);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  return `${months} month${months !== 1 ? 's' : ''}`;
}

function getAverageOrderPrice(totalSpent: number, totalOrders: number): string {
  if (totalOrders === 0) return 'EGP 0';
  const avg = totalSpent / totalOrders;
  return `EGP ${avg.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatStatsAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Pricing display helper ───────────────────────────────────────────────
const PRICING_LABELS: { key: keyof PricingRow; label: string }[] = [
  { key: 'Front', label: 'Front' },
  { key: 'Front_and_back', label: 'Front & Back' },
  { key: 'Digital_Cover_300g', label: 'Digital Cover 300g' },
  { key: 'Digital_Cover_200g', label: 'Digital Cover 200g' },
  { key: 'Offset_Cover_200g', label: 'Offset Cover 200g' },
  { key: 'Offset_Cover_300g', label: 'Offset Cover 300g' },
  { key: 'Coil_size_10', label: 'Coil Size 10' },
  { key: 'Coil_size_12', label: 'Coil Size 12' },
  { key: 'Coil_size_14', label: 'Coil Size 14' },
  { key: 'Coil_size_16', label: 'Coil Size 16' },
  { key: 'Coil_size_18', label: 'Coil Size 18' },
  { key: 'Coil_size_20', label: 'Coil Size 20' },
  { key: 'Coil_size_22', label: 'Coil Size 22' },
  { key: 'Coil_size_25', label: 'Coil Size 25' },
  { key: 'Coil_size_28', label: 'Coil Size 28' },
  { key: 'Coil_size_30', label: 'Coil Size 30' },
  { key: 'Coil_size_32', label: 'Coil Size 32' },
  { key: 'Coil_size_35', label: 'Coil Size 35' },
];

export default function ClientDetail() {
  const { id: clientId = '0' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pricing, setPricing] = useState<PricingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state for pricing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const numericClientId = Number(clientId);

        const [clientsRes, ordersRes, pricingRes] = await Promise.all([
          getClients(),
          getOrders(),
          getPricingByUser(numericClientId).catch(() => null), // 404 returns null
        ]);

        const clients: Client[] = clientsRes.data.data.results;
        const allOrders = ordersRes.data.data;

        const foundClient = clients.find(c => Number(c.id) === numericClientId);
        if (!foundClient) {
          setError(`Client with ID "${clientId}" not found.`);
          return;
        }

        const clientOrders = allOrders.filter((o: any) => o.customer === numericClientId);

        setClient(foundClient);
        setOrders(clientOrders);

        // Pricing might be null if not set
        if (pricingRes && pricingRes.data?.data) {
          setPricing(pricingRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Could not load client data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Inline edit handlers
  const startEdit = (field: string, currentValue: number | null) => {
    setEditingField(field);
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (field: string) => {
    if (!pricing) return;
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) return;

    setSaving(true);
    try {
      const updated = { ...pricing, [field]: value };
      const res = await updatePricing(pricing.id, { [field]: value });
      setPricing(res.data.data);
      setEditingField(null);
    } catch (err) {
      console.error('Failed to update pricing:', err);
    } finally {
      setSaving(false);
    }
  };

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

  // Compute stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
  const avgOrderPrice = getAverageOrderPrice(totalSpent, totalOrders);
  const customerSince = formatCustomerSince(client.since);
  const totalSpentFormatted = formatStatsAmount(totalSpent);

  const stats = [
    { label: 'Total Number of Orders', value: totalOrders.toString() },
    { label: 'Average Order Price', value: avgOrderPrice },
    { label: 'Customer Since', value: customerSince },
    { label: 'Total Amount Spent', value: totalSpentFormatted },
  ];

  const pastOrders = orders.map((order: any) => {
    const productName = order.upload?.file_name || `Order #${order.id}`;
    return {
      id: `#${order.id}`,
      fullId: order.id.toString(),
      product: productName,
      status: order.status,
      date: formatDate(order.created_at || null),
      total: formatAmount(order.total_price ?? null),
    };
  });

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
          <p><strong>Phone Number:</strong> {client.phone || '—'}</p>
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

      {/* Custom Pricing Table */}
      {pricing && (
        <section className="box" style={{ marginTop: 14 }}>
          <div className="table-head" style={{ marginBottom: 14 }}>
            <h3>Custom Pricing</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Edit prices per unit for this client. Changes are saved immediately.
            </p>
          </div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Price (EGP)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_LABELS.map(({ key, label }) => {
                const currentValue = pricing[key] ?? 0;
                const isEditing = editingField === key;
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>{label}</td>
                    {isEditing ? (
                      <td style={{ textAlign: 'right' }}>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                        />
                      </td>
                    ) : (
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {Number(currentValue).toFixed(2)}
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn primary"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={saving}
                            onClick={() => saveEdit(key)}
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => startEdit(key, currentValue)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

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
                <tr key={o.fullId}>
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
    </AppShell>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import DocumentSection from '../../components/DocumentSection';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import { getPricingByUser, updatePricingByUser } from '../../lib/api/pricingService';
import type { Client } from '../../lib/api/invoicesClientsSettingsService';
import type { PricingRow } from '../../lib/api/pricingService';

const DASH = '-';

type ClientOrder = {
  id: number;
  status?: string;
  customer?: number | string | null;
  customer_id?: number | string | null;
  client_id?: number | string | null;
  total_price?: number | string | null;
  created_at?: string | null;
  product_summary?: string | null;
  item_details?: Array<{
    item_type?: string | null;
    quantity?: number | string | null;
  }>;
  upload?: {
    file_name?: string | null;
  } | null;
};

const PRICING_LABELS: { key: keyof PricingRow; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'front_and_back', label: 'Front & Back' },
  { key: 'digital_cover_300g', label: 'Digital Cover 300g' },
  { key: 'digital_cover_200g', label: 'Digital Cover 200g' },
  { key: 'offset_cover_200g', label: 'Offset Cover 200g' },
  { key: 'offset_cover_300g', label: 'Offset Cover 300g' },
  { key: 'coil_size_10', label: 'Coil Size 10' },
  { key: 'coil_size_12', label: 'Coil Size 12' },
  { key: 'coil_size_14', label: 'Coil Size 14' },
  { key: 'coil_size_16', label: 'Coil Size 16' },
  { key: 'coil_size_18', label: 'Coil Size 18' },
  { key: 'coil_size_20', label: 'Coil Size 20' },
  { key: 'coil_size_22', label: 'Coil Size 22' },
  { key: 'coil_size_25', label: 'Coil Size 25' },
  { key: 'coil_size_28', label: 'Coil Size 28' },
  { key: 'coil_size_30', label: 'Coil Size 30' },
  { key: 'coil_size_32', label: 'Coil Size 32' },
  { key: 'coil_size_35', label: 'Coil Size 35' },
];

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results as T[];
  }
  return [];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return DASH;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return DASH;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCustomerSince(since: string | null): string {
  if (!since) return DASH;

  const start = new Date(since);
  if (Number.isNaN(start.getTime())) return DASH;

  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(months, 0);

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0) {
    return `${years} year${years === 1 ? '' : 's'}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
  }

  return `${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
}

function getOrderClientId(order: ClientOrder): number {
  return toNumber(order.customer ?? order.customer_id ?? order.client_id);
}

function getProductSummary(order: ClientOrder): string {
  const summary = (order.product_summary || '').trim();
  if (summary && summary !== `Order #${order.id}`) return summary;

  if (Array.isArray(order.item_details) && order.item_details.length > 0) {
    return order.item_details
      .map(item => {
        const name = (item.item_type || 'Order Item').trim();
        const quantity = toNumber(item.quantity) || 1;
        return `${name} (${quantity} pcs)`;
      })
      .join(', ');
  }

  const uploadName = order.upload?.file_name?.trim();
  return uploadName || `Order #${order.id}`;
}

export default function ClientDetail() {
  const { id: clientId = '0' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [pricing, setPricing] = useState<PricingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof PricingRow | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const numericClientId = Number(clientId);

        const [clientsRes, ordersRes, pricingRes] = await Promise.all([
          getClients(),
          getOrders(),
          getPricingByUser(numericClientId).catch(() => null),
        ]);

        if (!isMounted) return;

        const clients = unwrapList<Client>(clientsRes.data.data);
        const allOrders = unwrapList<ClientOrder>(ordersRes.data.data);
        const foundClient = clients.find(item => Number(item.id) === numericClientId);

        if (!foundClient) {
          setError(`Client with ID "${clientId}" not found.`);
          return;
        }

        setClient(foundClient);
        setOrders(allOrders.filter(order => getOrderClientId(order) === numericClientId));
        setPricing(pricingRes?.data?.data ?? null);
      } catch (err) {
        console.error('Failed to load client detail:', err);
        if (isMounted) setError('Could not load client data. Please try again later.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + toNumber(order.total_price), 0);
    const billableOrders = orders.filter(order => toNumber(order.total_price) > 0).length;
    const averageOrderPrice = billableOrders > 0 ? totalSpent / billableOrders : 0;

    return [
      { label: 'Total Number of Orders', value: String(totalOrders) },
      { label: 'Average Order Price', value: formatAmount(averageOrderPrice) },
      { label: 'Customer Since', value: formatCustomerSince(client?.since ?? null) },
      { label: 'Total Amount Spent', value: formatAmount(totalSpent) },
    ];
  }, [client?.since, orders]);

  const pastOrders = useMemo(
    () =>
      orders.map(order => ({
        id: `#${order.id}`,
        fullId: String(order.id),
        product: getProductSummary(order),
        status: order.status || 'UNPRICED_PENDING',
        date: formatDate(order.created_at),
        total: formatAmount(toNumber(order.total_price)),
      })),
    [orders]
  );

  const startEdit = (field: keyof PricingRow, currentValue: unknown) => {
    setEditingField(field);
    setEditValue(String(toNumber(currentValue)));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (field: keyof PricingRow) => {
    const value = toNumber(editValue);
    if (value < 0 || !Number.isFinite(value)) return;

    setSaving(true);

    try {
      const res = await updatePricingByUser(Number(clientId), {
        [field]: value,
      } as Partial<PricingRow>);

      setPricing(res.data.data);
      cancelEdit();
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

  return (
    <AppShell role="owner" activePage="client-management">
      <header className="topbar">
        <h1>Client Details - {client.name}</h1>
        <button className="btn" onClick={() => navigateTopLevel('client-management')}>
          Back to Client Management
        </button>
      </header>

      <section className="box">
        <div className="form-grid-2">
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Phone Number:</strong> {client.phone || DASH}</p>
          <p><strong>Address:</strong> {client.address || DASH}</p>
          <p><strong>Email:</strong> {client.email}</p>
        </div>
        <div className="line" />
        <div className="stats-grid">
          {stats.map(item => (
            <div key={item.label} className="stat-item">
              <p>{item.label}</p>
              <h4>{item.value}</h4>
            </div>
          ))}
        </div>
      </section>

      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Custom Pricing</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {pricing?.source === 'custom'
              ? 'Client-specific override prices. Changes are saved immediately.'
              : 'Default prices are shown. Editing any price creates a client-specific override.'}
          </p>
        </div>

        {!pricing ? (
          <p className="no-results">No default or client-specific pricing is configured yet.</p>
        ) : (
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
                const currentValue = pricing[key];
                const isEditing = editingField === key;

                return (
                  <tr key={String(key)}>
                    <td style={{ fontWeight: 500 }}>{label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={event => setEditValue(event.target.value)}
                          style={{ width: 110, textAlign: 'right', padding: '4px 8px' }}
                        />
                      ) : (
                        toNumber(currentValue).toFixed(2)
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn primary"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={saving}
                            onClick={() => saveEdit(key)}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          onClick={() => startEdit(key, currentValue)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Documents</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Click a document to expand its preview. Rename, download, or remove files below.
          </p>
        </div>
        <DocumentSection clientId={client.id} />
      </section>

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
              pastOrders.map(order => (
                <tr key={order.fullId}>
                  <td>{order.id}</td>
                  <td>{order.product}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{order.date}</td>
                  <td>{order.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import DocumentSection from '../../components/DocumentSection';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import type { Client } from '../../lib/api/invoicesClientsSettingsService';

// ─── Types for orders (from backend) ──────────────────────────────────────
interface BackendOrder {
  id: number;
  customer: number;
  status: string;
  total_price?: number | null;
  created_at?: string;
  upload?: { file_name?: string };
  // ... other fields as needed
}

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

export default function ClientDetail() {
  const { id: clientId = '0' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, ordersRes] = await Promise.all([
          getClients(),
          getOrders(),
        ]);

        const clients: Client[] = clientsRes.data.data.results;
        const allOrders: BackendOrder[] = ordersRes.data.data;

        const numericClientId = Number(clientId);
        const foundClient = clients.find(c => Number(c.id) === numericClientId);
        if (!foundClient) {
          setError(`Client with ID "${clientId}" not found.`);
          return;
        }

        // Filter orders by customer field (user ID)
        const clientOrders = allOrders.filter(o => o.customer === numericClientId);

        setClient(foundClient);
        setOrders(clientOrders);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Could not load client data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

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

  // Compute stats from actual orders
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const avgOrderPrice = getAverageOrderPrice(totalSpent, totalOrders);
  const customerSince = formatCustomerSince(client.since);
  const totalSpentFormatted = formatStatsAmount(totalSpent);

  const stats = [
    { label: 'Total Number of Orders', value: totalOrders.toString() },
    { label: 'Average Order Price', value: avgOrderPrice },
    { label: 'Customer Since', value: customerSince },
    { label: 'Total Amount Spent', value: totalSpentFormatted },
  ];

  const pastOrders = orders.map(order => {
    const productName = order.upload?.file_name || `Order #${order.id}`;
    return {
      id: `#${order.id}`,        // short display ID
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
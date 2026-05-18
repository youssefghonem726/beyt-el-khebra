import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getMe } from '../../lib/api/usersService';

// ─── Static data (no backend required) ────────────────────────────────
const STATUS_GUIDE = [
  { status: 'UNPRICED_PENDING', desc: 'Your order is waiting for pricing.' },
  { status: 'PRICED_PENDING_CONFIRMATION', desc: 'Quote has been sent – awaiting your approval.' },
  { status: 'IN_PROGRESS', desc: 'Your order is being produced.' },
  { status: 'COMPLETED', desc: 'Order is complete and ready for delivery.' },
  { status: 'CANCELED', desc: 'Order has been cancelled.' },
];

const STATUS_FILTERS = [
  { label: 'Unpriced', value: 'UNPRICED_PENDING' },
  { label: 'Pending Confirmation', value: 'PRICED_PENDING_CONFIRMATION' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Canceled', value: 'CANCELED' },
];

// ─── Types ────────────────────────────────────────────────────────────
interface DisplayOrder {
  id: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string;
  total: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTotal(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientDashboard() {
  const { navigateTopLevel } = useNavigation();

  const [clientName, setClientName] = useState<string>('Client');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingQuote: 0,
    inProgress: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile and orders in parallel
        const [userRes, ordersRes] = await Promise.all([
          getMe(),
          getOrders(),
        ]);

        const user = userRes.data.data;
        setClientName([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email);
        setClientEmail(user.email);
        setClientPhone(user.phone || '');

        const allOrders = ordersRes.data.data; // array of backend orders
        console.log('ClientDashboard - raw orders:', allOrders);

        // Map to display orders
        const displayOrders: DisplayOrder[] = allOrders.map((o: any) => ({
          id: String(o.id),
          product: o.upload?.file_name || `Order #${o.id}`,
          status: o.status,
          orderDate: formatDate(o.created_at),
          deliveryDate: formatDate(o.due_date || null),
          total: formatTotal(o.total_price),
        }));

        setOrders(displayOrders);

        // Compute stats
        const totalOrders = displayOrders.length;
        const pendingQuote = allOrders.filter((o: any) => o.status === 'UNPRICED_PENDING').length;
        const inProgress = allOrders.filter((o: any) => o.status === 'IN_PROGRESS').length;
        const completed = allOrders.filter((o: any) => o.status === 'COMPLETED').length;

        setStats({ totalOrders, pendingQuote, inProgress, completed });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Could not load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter orders by search query and status
  const filtered = orders.filter((o) => {
    const matchQ = !query || o.id.toLowerCase().includes(query.toLowerCase()) || o.product.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || o.status === filterStatus;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="client-dashboard">
        <Topbar title="Dashboard" />
        <div className="loading-state">Loading your dashboard...</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-dashboard">
      <Topbar title="Dashboard" />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="welcome">
        <h2>Welcome back, {clientName}</h2>
        <p>Here's what is happening with your orders.</p>
        <div className="client-info" style={{ marginTop: 8 }}>
          <span>📧 {clientEmail}</span>
          {clientPhone && <span>📞 {clientPhone}</span>}
        </div>
      </section>

      <section className="grid-4">
        <StatCard label="Total Orders"  value={stats.totalOrders}  sub="All time" />
        <StatCard label="Pending Quote" value={stats.pendingQuote} sub="Awaiting pricing" />
        <StatCard label="In Progress"   value={stats.inProgress}   sub="Currently in production" />
        <StatCard label="Completed"     value={stats.completed}    sub="Successfully completed" />
      </section>

      <section className="content">
        <article className="table-wrap">
          <div className="table-head">
            <h3>My Orders</h3>
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder="Search by order ID or product"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Status</option>
                      {STATUS_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                </div>
              )}
            </div>
          </div>

          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Product</th><th>Status</th>
                <th>Order Date</th><th>Delivery Date</th><th>Total</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="no-results">No matching results</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td>{o.product}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.orderDate}</td>
                    <td>{o.deliveryDate}</td>
                    <td>{o.total}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>Quick Actions</h3>
            <button className="btn block primary" onClick={() => navigateTopLevel('place-new-order')}>Place New Order</button>
            <button className="btn block" onClick={() => navigateTopLevel('quotes')}>View Quotes</button>
            <button className="btn block" onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </section>

          <section className="box">
            <h3>Order Status Guide</h3>
            <ul className="status-list">
              {STATUS_GUIDE.map((s) => (
                <li key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StatusBadge status={s.status} />
                  <span className="status-desc">{s.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
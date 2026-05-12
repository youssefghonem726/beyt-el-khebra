import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

// --- Updated interfaces to match the new normalized JSON files ---
export interface Client {
  id: string;          // e.g., "CL-001"
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  since: string | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
  };
}

export interface Order {
  id: string;          // e.g., "ORD-1021-2025"
  clientId: string;    // needed to filter by client
  product: string;     // was "type" in old version
  status: string;
  orderDate: string;   // ISO date e.g. "2025-04-21"
  deliveryDate: string | null;
  total: number | null;
  // other fields exist but not needed for the dashboard list
}

export interface DashboardStats {
  totalOrders: number;
  pendingQuote: number;
  inProgress: number;
  completed: number;
}

export interface StatusFilterOption {
  label: string;
  value: string;
}

export interface StatusGuideItem {
  status: string;
  desc: string;
}

export interface DashboardData {
  client: Client | null;
  stats: DashboardStats;
  orders: Order[];
  statusFilters: StatusFilterOption[];
  statusGuide: StatusGuideItem[];
}

interface Props {
  /** Optional: specify which client to load by id (e.g., "CL-001") or name (e.g., "Ahmed Store"). Defaults to "CL-001" */
  clientIdentifier?: string;
  /** Optional: provide custom data source URLs */
  dataUrls?: {
    clients?: string;
    orders?: string;
    statusFilters?: string;
    statusGuide?: string;
  };
  fallbackData?: Partial<DashboardData>;
}

// Default empty state
const DEFAULT_DATA: DashboardData = {
  client: null,
  stats: { totalOrders: 0, pendingQuote: 0, inProgress: 0, completed: 0 },
  orders: [],
  statusFilters: [],
  statusGuide: [],
};

// Default URLs for the new normalized JSON files
const DEFAULT_URLS = {
  clients: '/data/json/clients.json',
  orders: '/data/json/orders.json',
  statusFilters: '/data/json/statusFilters.json',
  statusGuide: '/data/json/statusGuide.json',
};

// Helper: format ISO date to "DD MMM YYYY" (e.g., "21 Apr 2025")
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Helper: format total (number) to currency string
function formatTotal(total: number | null): string {
  if (total === null || total === undefined) return '—';
  return total.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: find client - defaults to "CL-001" when no identifier provided
function findClient(clients: Client[], identifier?: string): Client | null {
  if (!clients.length) return null;
  
  // If an identifier is given, try to find by id or name
  if (identifier) {
    const lowerId = identifier.toLowerCase();
    const matched = clients.find(c => 
      c.id.toLowerCase() === lowerId || 
      c.name.toLowerCase() === lowerId
    );
    if (matched) return matched;
  }
  
  // No identifier or not found – default to CL-001
  const defaultClient = clients.find(c => c.id === "CL-001");
  if (defaultClient) return defaultClient;
  
  // Ultimate fallback: first client
  return clients[0];
}

export default function ClientDashboard({ clientIdentifier, dataUrls, fallbackData }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const urls = { ...DEFAULT_URLS, ...dataUrls };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all required JSON files in parallel
        const [clientsRes, ordersRes, statusFiltersRes, statusGuideRes] = await Promise.allSettled([
          fetch(urls.clients),
          fetch(urls.orders),
          fetch(urls.statusFilters),
          fetch(urls.statusGuide),
        ]);

        const parseResponse = async (response: PromiseSettledResult<Response>, fallback: any) => {
          if (response.status === 'fulfilled' && response.value.ok) {
            try {
              return await response.value.json();
            } catch {
              return fallback;
            }
          }
          return fallback;
        };

        let clients: Client[] = await parseResponse(clientsRes, []);
        if (!Array.isArray(clients)) clients = [];
        
        let orders: Order[] = await parseResponse(ordersRes, []);
        if (!Array.isArray(orders)) orders = [];

        const statusFilters = await parseResponse(statusFiltersRes, []);
        const statusGuide = await parseResponse(statusGuideRes, []);

        // Determine which client is currently selected (defaults to CL-001)
        const selectedClient = findClient(clients, clientIdentifier);
        
        if (selectedClient) {
          // Filter orders belonging to this client
          const clientOrders = orders.filter(order => order.clientId === selectedClient.id);
          
          // Compute stats from filtered orders
          const totalOrders = clientOrders.length;
          const pendingQuote = clientOrders.filter(o => o.status === 'unpriced_pending').length;
          const inProgress = clientOrders.filter(o => o.status === 'in_progress').length;
          const completed = clientOrders.filter(o => o.status === 'completed').length;
          
          // Prepare orders for display (transform fields as needed)
          const displayOrders = clientOrders.map(order => ({
            id: order.id,
            product: order.product,
            status: order.status,
            orderDate: formatDate(order.orderDate),
            deliveryDate: formatDate(order.deliveryDate),
            total: formatTotal(order.total),
          }));
          
          setDashboardData({
            client: selectedClient,
            stats: { totalOrders, pendingQuote, inProgress, completed },
            orders: displayOrders,
            statusFilters,
            statusGuide,
            ...fallbackData, // override with any manual fallback
          });
        } else {
          // No client found – show empty state
          setDashboardData({
            client: null,
            stats: { totalOrders: 0, pendingQuote: 0, inProgress: 0, completed: 0 },
            orders: [],
            statusFilters,
            statusGuide,
            ...fallbackData,
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [urls.clients, urls.orders, urls.statusFilters, urls.statusGuide, clientIdentifier, fallbackData]);

  // Filter orders based on search query and status
  const filtered = dashboardData.orders.filter((o) => {
    const matchQ = !query || o.id.toLowerCase().includes(query.toLowerCase()) || o.product.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || o.status === filterStatus;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="client-dashboard">
        <Topbar title="Dashboard" />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-dashboard">
      <Topbar title="Dashboard" />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <section className="welcome">
        <h2>Welcome back, {dashboardData.client?.name || 'Guest'}</h2>
        <p>Here's what is happening with your orders.</p>
        {dashboardData.client && (
          <div className="client-info">
            <span>📧 {dashboardData.client.email}</span>
            <span>📞 {dashboardData.client.phone}</span>
            {dashboardData.client.address && <span>📍 {dashboardData.client.address}</span>}
          </div>
        )}
      </section>

      <section className="grid-4 stats-row">
        <StatCard label="Total Orders"  value={dashboardData.stats.totalOrders}  sub="All time"                  />
        <StatCard label="Pending Quote" value={dashboardData.stats.pendingQuote} sub="Awaiting pricing"           />
        <StatCard label="In Progress"   value={dashboardData.stats.inProgress}   sub="Currently in production"   />
        <StatCard label="Completed"     value={dashboardData.stats.completed}    sub="Successfully completed"     />
      </section>

      <section className="content dashboard-content">
        <article className="table-wrap orders-card">
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
                    <label htmlFor="order-status">Status</label>
                    <select
                      className="select"
                      id="order-status"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      {dashboardData.statusFilters.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                </div>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th><th>Product</th><th>Status</th>
                  <th>Order Date</th><th>Delivery Date</th><th>Total (EGP)</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="no-results">No matching results</td></tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.id}</strong></td>
                      <td>{o.product}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{o.orderDate}</td>
                      <td>{o.deliveryDate}</td>
                      <td>{o.total}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>View</button>
                          <button className="btn btn-sm" onClick={() => navigateTopLevel('track-order')}>Track</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="stack sidebar-cards">
          <section className="box quick-actions">
            <h3>Quick Actions</h3>
            <button className="btn block primary" onClick={() => navigateTopLevel('place-new-order')}>Place New Order</button>
            <button className="btn block"         onClick={() => navigateTopLevel('quotes')}>View Quotes</button>
            <button className="btn block"         onClick={() => navigateTopLevel('support')}>Contact Support</button>
          </section>

          <section className="box status-guide">
            <h3>Order Status Guide</h3>
            <ul className="status-list">
              {dashboardData.statusGuide.map((s) => (
                <li key={s.status}>
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
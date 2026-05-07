import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

export interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

export interface Order {
  id: string;
  type: string;
  status: string;
  orderDate: string;
  deliveryDate: string;
  total: string;
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
  onNavigate: (page: string) => void;
  /** Optional: specify which client to load (by name or index). Defaults to first client */
  clientIdentifier?: string | number;
  /** Optional: provide custom data source URLs */
  dataUrls?: {
    clients?: string;
    stats?: string;
    orders?: string;
    statusFilters?: string;
    statusGuide?: string;
  };
  fallbackData?: Partial<DashboardData>;
}

// ─── Defaults (mirrors the original hardcoded values) ─────────────────────────

const DEFAULT_DATA: DashboardData = {
  client: { name: 'Ahmed Store', email: 'ahmed@store.com', phone: '+20 101 000 1021', page: 'client-detail-ahmed' },
  stats: {
    totalOrders: 127,
    pendingQuote: 3,
    inProgress: 5,
    completed: 119,
  },
  orders: [
    { id: '#1021', type: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION', orderDate: '21 Apr 2025', deliveryDate: '25 Apr 2025', total: '1,200.00' },
    { id: '#1020', type: 'Flyers A5',      status: 'IN_PROGRESS',                orderDate: '18 Apr 2025', deliveryDate: '23 Apr 2025', total: '2,400.00' },
    { id: '#1018', type: 'Posters A3',     status: 'UNPRICED_PENDING',           orderDate: '15 Apr 2025', deliveryDate: '—',           total: '—'        },
    { id: '#1015', type: 'Stickers',       status: 'COMPLETED',                  orderDate: '10 Apr 2025', deliveryDate: '14 Apr 2025', total: '850.00'   },
    { id: '#1012', type: 'Banners',        status: 'CANCELED',                   orderDate: '05 Apr 2025', deliveryDate: '—',           total: '—'        },
  ],
  statusFilters: [
    { label: 'Unpriced Pending',           value: 'unpriced_pending'           },
    { label: 'Priced Pending Confirmation', value: 'priced_pending_confirmation' },
    { label: 'In Progress',                value: 'in_progress'                },
    { label: 'Completed',                  value: 'completed'                  },
    { label: 'Canceled',                   value: 'canceled'                   },
  ],
  statusGuide: [
    { status: 'UNPRICED_PENDING',            desc: 'Waiting for pricing'    },
    { status: 'PRICED_PENDING_CONFIRMATION', desc: 'Ready for confirmation' },
    { status: 'IN_PROGRESS',                 desc: 'Production started'     },
    { status: 'COMPLETED',                   desc: 'Order delivered'        },
    { status: 'CANCELED',                    desc: 'Order canceled'         },
  ],
};

// Default URLs for JSON files
const DEFAULT_URLS = {
  clients: '/data/clients.json',
  stats: '/data/stats.json',
  orders: '/data/orders.json',
  statusFilters: '/data/statusFilters.json',
  statusGuide: '/data/statusGuide.json',
};

export default function ClientDashboard({ onNavigate, clientIdentifier, dataUrls, fallbackData }: Props) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Merge URLs with defaults
  const urls = { ...DEFAULT_URLS, ...dataUrls };

  // Helper to find client by name or index
  const findClient = (clients: Client[], identifier?: string | number): Client | null => {
    if (!identifier || clients.length === 0) return clients[0] || null;
    
    if (typeof identifier === 'number') {
      return clients[identifier] || clients[0] || null;
    }
    
    // Search by name (case-insensitive)
    return clients.find(c => c.name.toLowerCase() === identifier.toLowerCase()) || clients[0] || null;
  };

  // Fetch data from JSON files
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all data in parallel
        const [clientsRes, statsRes, ordersRes, statusFiltersRes, statusGuideRes] = await Promise.allSettled([
          fetch(urls.clients),
          fetch(urls.stats),
          fetch(urls.orders),
          fetch(urls.statusFilters),
          fetch(urls.statusGuide),
        ]);

        // Helper to safely parse JSON
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

        // Extract data with fallbacks
        let clients = await parseResponse(clientsRes, [DEFAULT_DATA.client]);
        if (!Array.isArray(clients)) clients = [clients];
        
        const stats = await parseResponse(statsRes, DEFAULT_DATA.stats);
        const orders = await parseResponse(ordersRes, DEFAULT_DATA.orders);
        const statusFilters = await parseResponse(statusFiltersRes, DEFAULT_DATA.statusFilters);
        const statusGuide = await parseResponse(statusGuideRes, DEFAULT_DATA.statusGuide);

        // Find the selected client
        const selectedClient = findClient(clients, clientIdentifier);
        
        // Apply any fallback data passed as prop (overrides fetched data)
        setDashboardData({
          client: fallbackData?.client ?? selectedClient,
          stats: { ...stats, ...fallbackData?.stats },
          orders: fallbackData?.orders ?? orders,
          statusFilters: fallbackData?.statusFilters ?? statusFilters,
          statusGuide: fallbackData?.statusGuide ?? statusGuide,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Using cached data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [urls.clients, urls.stats, urls.orders, urls.statusFilters, urls.statusGuide, clientIdentifier, fallbackData]);

  const filtered = dashboardData.orders.filter((o) => {
    const matchQ = !query || o.id.toLowerCase().includes(query.toLowerCase()) || o.type.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || o.status.toLowerCase().replace(/_/g, ' ').includes(filterStatus.replace(/_/g, ' '));
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="client-dashboard" onNavigate={onNavigate}>
        <Topbar title="Dashboard" />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-dashboard" onNavigate={onNavigate}>
      <Topbar title="Dashboard" />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <section className="welcome">
        <h2>Welcome back, {dashboardData.client?.name}</h2>
        <p>Here's what is happening with your orders.</p>
        {dashboardData.client && (
          <div className="client-info">
            <span> {dashboardData.client.name}</span>
            <span> Email {dashboardData.client.email}</span>
            <span> Phone number: {dashboardData.client.phone}</span>
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
                placeholder="Search by order ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
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
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th><th>Type</th><th>Status</th>
                  <th>Order Date</th><th>Delivery Date</th><th>Total (EGP)</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="no-results">No matching results</td></tr>
                ) : filtered.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.id}</strong></td>
                    <td>{o.type}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.orderDate}</td>
                    <td>{o.deliveryDate}</td>
                    <td>{o.total}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm" onClick={() => onNavigate(`client-order-${o.id.replace('#', '')}`)}>View</button>
                        <button className="btn btn-sm" onClick={() => onNavigate('track-order')}>Track</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="stack sidebar-cards">
          <section className="box quick-actions">
            <h3>Quick Actions</h3>
            <button className="btn block primary" onClick={() => onNavigate('place-new-order')}>Place New Order</button>
            <button className="btn block"         onClick={() => onNavigate('quotes')}>View Quotes</button>
            <button className="btn block"         onClick={() => onNavigate('support')}>Contact Support</button>
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
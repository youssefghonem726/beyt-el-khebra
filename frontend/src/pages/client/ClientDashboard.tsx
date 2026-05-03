import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

interface Props {
  onNavigate: (page: string) => void;
}

interface Order {
  id: string;
  type: string;
  status: string;
  orderDate: string;
  deliveryDate: string;
  total: string;
}

const ORDERS: Order[] = [
  { id: '#1021', type: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION', orderDate: '21 Apr 2025', deliveryDate: '25 Apr 2025', total: '1,200.00' },
  { id: '#1020', type: 'Flyers A5', status: 'IN_PROGRESS', orderDate: '18 Apr 2025', deliveryDate: '23 Apr 2025', total: '2,400.00' },
  { id: '#1018', type: 'Posters A3', status: 'UNPRICED_PENDING', orderDate: '15 Apr 2025', deliveryDate: '—', total: '—' },
  { id: '#1015', type: 'Stickers', status: 'COMPLETED', orderDate: '10 Apr 2025', deliveryDate: '14 Apr 2025', total: '850.00' },
  { id: '#1012', type: 'Banners', status: 'CANCELED', orderDate: '05 Apr 2025', deliveryDate: '—', total: '—' },
];

const STATUS_FILTERS = [
  { label: 'Unpriced Pending', value: 'unpriced_pending' },
  { label: 'Priced Pending Confirmation', value: 'priced_pending_confirmation' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Canceled', value: 'canceled' },
];

const STATUS_GUIDE = [
  { status: 'UNPRICED_PENDING', desc: 'Waiting for pricing' },
  { status: 'PRICED_PENDING_CONFIRMATION', desc: 'Ready for confirmation' },
  { status: 'IN_PROGRESS', desc: 'Production started' },
  { status: 'COMPLETED', desc: 'Order delivered' },
  { status: 'CANCELED', desc: 'Order canceled' },
];

export default function ClientDashboard({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = ORDERS.filter((o) => {
    const matchQ = !query || o.id.toLowerCase().includes(query.toLowerCase()) || o.type.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || o.status.toLowerCase().replace(/_/g, ' ').includes(filterStatus.replace(/_/g, ' '));
    return matchQ && matchS;
  });

  return (
    <AppShell role="client" activePage="client-dashboard" onNavigate={onNavigate}>
        <Topbar title="Dashboard" userName="Client Name" />

        <section className="welcome">
          <h2>Welcome back, Client Name</h2>
          <p>Here's what is happening with your orders.</p>
        </section>

        <section className="grid-4 stats-row">
          <StatCard label="Total Orders" value={127} sub="All time" />
          <StatCard label="Pending Quote" value={3} sub="Awaiting pricing" />
          <StatCard label="In Progress" value={5} sub="Currently in production" />
          <StatCard label="Completed" value={119} sub="Successfully completed" />
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
                      <select className="select" id="order-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
                  </div>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Type</th><th>Status</th><th>Order Date</th><th>Delivery Date</th><th>Total (EGP)</th><th>Action</th>
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
                          <button className="btn btn-sm" onClick={() => onNavigate('my-orders')}>View</button>
                          <button className="btn btn-sm" onClick={() => onNavigate('track-order')}>Track</button>
                          <button className="btn btn-sm btn-outline">Review</button>
                          <button className="btn btn-sm btn-outline" onClick={() => onNavigate('my-orders')}>Details</button>
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
              <button className="btn block" onClick={() => onNavigate('quotes')}>View Quotes</button>
              <button className="btn block" onClick={() => onNavigate('support')}>Contact Support</button>
            </section>

            <section className="box status-guide">
              <h3>Order Status Guide</h3>
              <ul className="status-list">
                {STATUS_GUIDE.map((s) => (
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

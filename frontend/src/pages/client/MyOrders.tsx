import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

interface Order {
  id: string;
  batch: string;
  product: string;
  status: string;
  delivery: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
  date: string;
  total: string;
  payment: string;
  paid: string;
}

export default function MyOrders({ onNavigate }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/data/my-orders.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Order[]) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError('Could not load your orders. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filtered = orders.filter((o) => {
    const q = query.toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.batch.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
    const matchS = !filterStatus || o.status.toLowerCase().includes(filterStatus.toLowerCase());
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="my-orders" onNavigate={onNavigate}>
        <Topbar title="My Orders" userName="Client Name" />
        <section className="table-wrap">
          <div className="loading-state">Loading your orders...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="my-orders" onNavigate={onNavigate}>
        <Topbar title="My Orders" userName="Client Name" />
        <section className="table-wrap">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders" onNavigate={onNavigate}>
      <Topbar title="My Orders" userName="Client Name" />
      <section className="table-wrap">
        <div className="table-head">
          <h3>All Orders</h3>
          <div className="actions-inline">
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder="Batch lookup by code, order ID, or product..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
                ▼
              </button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="PRICED_PENDING_CONFIRMATION">Priced Pending Confirmation</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => onNavigate('place-new-order')}>New Order</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order</th><th>Batch Code</th><th>Product</th><th>Status</th><th>Delivery Progress</th><th>Date</th><th>Total</th><th>Payment Method</th><th>Paid Amount</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={10} className="no-results">No matching results</td></tr>
              : filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.batch}</td>
                  <td>{o.product}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <StatusBadge status={o.delivery} />
                    <ProgressBar percent={o.progress} color={o.color} style={{ marginTop: 6 }} />
                  </td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                  <td>{o.payment}</td>
                  <td>{o.paid}</td>
                  <td><button className="btn" onClick={() => onNavigate('manager-order-details')}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
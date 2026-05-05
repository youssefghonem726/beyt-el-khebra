import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

interface Delivery {
  order: string;
  client: string;
  id: string;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
}

export default function DeliveryTracking({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/deliveries.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Delivery[]) => {
        setDeliveries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load deliveries:', err);
        setError('Could not load delivery data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filtered = deliveries.filter((d) => {
    const q = query.toLowerCase();
    return !q || d.order.toLowerCase().includes(q) || d.client.toLowerCase().includes(q) || d.driver.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
        <Topbar title="Delivery Tracking" userName="Admin User" />
        <section className="box">
          <h3>Delivery Schedule</h3>
          <div className="loading-state">Loading deliveries...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
        <Topbar title="Delivery Tracking" userName="Admin User" />
        <section className="box">
          <h3>Delivery Schedule</h3>
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
      <Topbar title="Delivery Tracking" userName="Admin User" />
      <section className="box">
        <h3>Delivery Schedule</h3>
        <div className="search-container">
          <input
            className="input"
            type="search"
            placeholder="Search by order, client, driver"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
            ▼
          </button>
          {dropdownOpen && (
            <div className="filter-dropdown show">
              <div className="field">
                <label>Delivery Status</label>
                <select className="select">
                  <option>All Delivery Status</option>
                  <option>On Time</option>
                  <option>Delayed</option>
                  <option>Lost In Transit</option>
                </select>
              </div>
              <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                Apply Filters
              </button>
            </div>
          )}
        </div>
        <div className="table-responsive">
          <table className="delivery-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Client Name</th>
                <th>ID</th>
                <th>Address</th>
                <th>Driver Name</th>
                <th>Driver Company</th>
                <th>Driver Number</th>
                <th>Delivery Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.order}>
                  <td>{d.order}</td>
                  <td>{d.client}</td>
                  <td>{d.id}</td>
                  <td>{d.address}</td>
                  <td>{d.driver}</td>
                  <td>{d.company}</td>
                  <td>{d.phone}</td>
                  <td>
                    <StatusBadge status={d.status} />
                    <ProgressBar percent={d.progress} color={d.color} style={{ marginTop: 8 }} />
                    {d.status === 'LOST IN TRANSIT' && <p className="tiny muted">More than 2 days delayed</p>}
                  </td>
                  <td>
                    <div className="actions-inline">
                      <button className="btn btn-sm">Cancel Order</button>
                      <button className="btn btn-sm">Reschedule Date</button>
                      <button className="btn btn-sm primary" onClick={() => onNavigate('delivery-view-more')}>
                        View More
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
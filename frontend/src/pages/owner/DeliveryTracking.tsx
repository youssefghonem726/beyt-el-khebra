import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

const DELIVERIES = [
  { order: '#1021', client: 'Ahmed Store', id: 'CX-001', address: '15 Tahrir St, Cairo', driver: 'Omar Hassan', company: 'Swift Express', phone: '+20 111 555 8801', status: 'ON TIME', progress: 75, color: 'green' as const },
  { order: '#1020', client: 'Design Hub', id: 'CX-002', address: '7 Smart Village, Giza', driver: 'Mona Adel', company: 'Urban Delivery', phone: '+20 114 201 3332', status: 'DELAYED', progress: 55, color: 'orange' as const },
  { order: '#1019', client: 'Retail Plus', id: 'CX-003', address: '42 Corniche Rd, Alexandria', driver: 'Yousef Nabil', company: 'RoadLine', phone: '+20 115 449 2907', status: 'LOST IN TRANSIT', progress: 35, color: 'red' as const },
];

export default function DeliveryTracking({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = DELIVERIES.filter((d) => {
    const q = query.toLowerCase();
    return !q || d.order.toLowerCase().includes(q) || d.client.toLowerCase().includes(q) || d.driver.toLowerCase().includes(q);
  });

  return (
    <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
      <Topbar title="Delivery Tracking" userName="Admin User" />
      <section className="box">
        <h3>Delivery Schedule</h3>
        <div className="search-container">
          <input className="input" type="search" placeholder="Search by order, client, driver" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
          {dropdownOpen && (
            <div className="filter-dropdown show">
              <div className="field">
                <label>Delivery Status</label>
                <select className="select"><option>All Delivery Status</option><option>On Time</option><option>Delayed</option><option>Lost In Transit</option></select>
              </div>
              <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
            </div>
          )}
        </div>
        <div className="table-responsive">
          <table className="delivery-table">
            <thead>
              <tr><th>Order Number</th><th>Client Name</th><th>ID</th><th>Address</th><th>Driver Name</th><th>Driver Company</th><th>Driver Number</th><th>Delivery Status</th><th>Action</th></tr>
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
                      <button className="btn btn-sm primary" onClick={() => onNavigate('delivery-view-more')}>View More</button>
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

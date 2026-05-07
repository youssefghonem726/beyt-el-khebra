import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

const ORDERS = [
  { id: '#1021', batch: 'B-240421-A', product: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION', delivery: 'ON TIME', progress: 75, color: 'green' as const, date: '21 Apr 2025', total: 'EGP 1,200.00', payment: 'Bank Transfer', paid: 'EGP 1,200.00' },
  { id: '#1020', batch: 'B-240418-C', product: 'Flyers A5', status: 'IN_PROGRESS', delivery: 'DELAYED', progress: 55, color: 'orange' as const, date: '18 Apr 2025', total: 'EGP 2,400.00', payment: 'Cash', paid: 'EGP 1,000.00' },
];

export default function MyOrders() {
  const { navigateTopLevel } = useNavigation();
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = ORDERS.filter((o) => {
    const q = query.toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.batch.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
    const matchS = !filterStatus || o.status.toLowerCase().includes(filterStatus.toLowerCase());
    return matchQ && matchS;
  });

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title="My Orders" />
      <section className="table-wrap">
        <div className="table-head">
          <h3>All Orders</h3>
          <div className="actions-inline">
            <div className="search-container">
              <input className="input" type="search" placeholder="Batch lookup by code, order ID, or product..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
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
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>New Order</button>
          </div>
        </div>
        <table className="orders-table">
          <thead>
            <tr><th>Order</th><th>Batch Code</th><th>Product</th><th>Status</th><th>Delivery Progress</th><th>Date</th><th>Total</th><th>Payment Method</th><th>Paid Amount</th><th>Action</th></tr>
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
                  <td><button className="btn" onClick={() => navigateTopLevel(`client-order-${o.id.replace('#','')}`)}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
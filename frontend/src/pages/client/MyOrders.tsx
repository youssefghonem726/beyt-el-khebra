import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

// Normalized types
interface Order {
  id: string;
  clientId: string;
  product: string;
  status: string;
  orderDate: string;      // ISO date
  deliveryDate: string | null;
  total: number | null;
  paid: number | null;
  paymentMethod: string | null;
  invoiceId: string | null;
}

interface Batch {
  id: string;
  orderId: string;
  progress: number;
  status: string;
  deadline: string | null;
}

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  progress: number;
  scheduledDate: string;
}

// Extended order for display
interface DisplayOrder {
  id: string;            // full ID e.g. "ORD-1021-2025"
  shortId: string;       // "#1021" for legacy display
  batch: string;
  product: string;
  status: string;
  delivery: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
  date: string;          // formatted date
  total: string;
  payment: string;
  paid: string;
}

// Helper: format ISO date to "DD MMM YYYY"
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Helper: format amount as currency string
function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Map status to color for progress bar
function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'canceled') return 'red';
  if (progress >= 100) return 'green';
  if (progress > 0) return 'orange';
  return 'orange';
}

// Generate short ID (e.g., extract last 4 digits from ORD-1021-2025 -> "#1021")
function getShortId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

interface Props {
  /** Client ID (e.g., "CL-001") – defaults to CL-001 */
  clientId?: string;
}

export default function MyOrders({ clientId = 'CL-001' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch all required data in parallel
    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/deliveries.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, deliveriesData]) => {
        const allOrders: Order[] = ordersData;
        const batches: Batch[] = batchesData;
        const deliveries: Delivery[] = deliveriesData;

        // Filter orders for this client
        const clientOrders = allOrders.filter(order => order.clientId === clientId);

        // Build display orders
        const displayOrders: DisplayOrder[] = clientOrders.map(order => {
          const batch = batches.find(b => b.orderId === order.id);
          const delivery = deliveries.find(d => d.orderId === order.id);

          let progress = batch ? batch.progress : 0;
          if (order.status === 'completed') progress = 100;
          if (order.status === 'canceled') progress = 0;

          let deliveryStatus = order.deliveryDate ? 'scheduled' : '—';
          if (delivery) {
            deliveryStatus = delivery.status;
          } else if (order.status === 'completed') {
            deliveryStatus = 'delivered';
          } else if (order.status === 'canceled') {
            deliveryStatus = 'canceled';
          }

          return {
            id: order.id,
            shortId: getShortId(order.id),
            batch: batch ? batch.id : '—',
            product: order.product,
            status: order.status,
            delivery: deliveryStatus,
            progress,
            color: getProgressColor(progress, order.status),
            date: formatDate(order.orderDate),
            total: formatAmount(order.total),
            payment: order.paymentMethod || '—',
            paid: formatAmount(order.paid),
          };
        });

        setOrders(displayOrders);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError('Could not load your orders. Please try again later.');
        setLoading(false);
      });
  }, [clientId]);

  const filtered = orders.filter((o) => {
    const q = query.toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.shortId.toLowerCase().includes(q) || o.batch.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
    const matchS = !filterStatus || o.status.toLowerCase().includes(filterStatus.toLowerCase());
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title="My Orders" />
        <div className="loading-state">Loading orders...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="my-orders">
        <Topbar title="My Orders" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="my-orders">
      <Topbar title="My Orders" />
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
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="unpriced_pending">Unpriced Pending</option>
                      <option value="priced_pending_confirmation">Priced Pending Confirmation</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>New Order</button>
          </div>
        </div>
        <table className="orders-table">
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
                  <td>{o.shortId}</td>
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
                  <td><button className="btn" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>View</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
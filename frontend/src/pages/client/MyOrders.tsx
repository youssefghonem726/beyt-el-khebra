import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getBatches } from '../../lib/api/batchesService';
import { getDeliveries } from '../../lib/api/deliveriesService';

// ─── Backend shapes ─────────────────────────────────────────────────
interface BackendOrder {
  id: number;
  status: string;
  total_price?: number | null;
  paid_amount?: number | null;
  payment_method?: string | null;
  created_at?: string;
  due_date?: string | null;
  upload?: { file_name?: string };
}

interface BackendBatch {
  id: number;
  orderId: number;
  progress: number;
  status: string;
  deadline?: string | null;
  // ... other fields not needed here
}

interface BackendDelivery {
  id: number;
  orderId: number;
  status: string;
  progress: number;
  scheduledDate: string;
  // ...
}

// ─── Display shape ─────────────────────────────────────────────────
interface DisplayOrder {
  id: string;
  shortId: string;
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

// ─── Helpers ───────────────────────────────────────────────────────
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProgressColor(progress: number, orderStatus: string): 'green' | 'orange' | 'red' {
  if (orderStatus === 'CANCELED') return 'red';
  if (progress >= 100) return 'green';
  if (progress > 0) return 'orange';
  return 'orange';
}

function getShortId(id: number): string {
  return `#${id}`;
}

export default function MyOrders() {
  const { navigateTopLevel } = useNavigation();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orders, batches, and deliveries in parallel
        const [ordersRes, batchesRes, deliveriesRes] = await Promise.all([
          getOrders(),
          getBatches(),
          getDeliveries(),
        ]);

        const backendOrders: BackendOrder[] = ordersRes.data.data;
        const batches: BackendBatch[] = batchesRes.data.data;
        const deliveries: BackendDelivery[] = deliveriesRes.data.data;

        console.log('MyOrders - orders:', backendOrders);
        console.log('MyOrders - batches:', batches);
        console.log('MyOrders - deliveries:', deliveries);

        // Build maps for quick lookup
        const batchMap = new Map(batches.map(b => [b.orderId, b]));
        const deliveryMap = new Map(deliveries.map(d => [d.orderId, d]));

        const displayOrders: DisplayOrder[] = backendOrders.map((o) => {
          const batch = batchMap.get(o.id);
          const delivery = deliveryMap.get(o.id);

          // Progress: from batch if available, else derived from order status
          let progress = batch ? batch.progress : 0;
          if (o.status === 'COMPLETED') progress = 100;
          if (o.status === 'CANCELED') progress = 0;

          // Delivery status
          let deliveryStatus = delivery ? delivery.status : '—';
          if (!delivery) {
            if (o.status === 'COMPLETED') deliveryStatus = 'delivered';
            else if (o.status === 'CANCELED') deliveryStatus = 'canceled';
          }

          // Product name from upload file name, fallback to "Order #id"
          const productName = o.upload?.file_name || `Order #${o.id}`;

          return {
            id: String(o.id),
            shortId: getShortId(o.id),
            batch: batch ? `BATCH-${batch.id}` : '—',   // or just batch.id
            product: productName,
            status: o.status,
            delivery: deliveryStatus,
            progress,
            color: getProgressColor(progress, o.status),
            date: formatDate(o.created_at || null),
            total: formatAmount(o.total_price ?? null),
            payment: o.payment_method || '—',
            paid: formatAmount(o.paid_amount ?? null),
          };
        });

        setOrders(displayOrders);
      } catch (err) {
        console.error('Failed to load orders:', err);
        setError('Could not load your orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = orders.filter((o) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.shortId.toLowerCase().includes(q) ||
      o.batch.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q);
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
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
                ▼
              </button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select
                      className="select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option value="UNPRICED_PENDING">Unpriced Pending</option>
                      <option value="PRICED_PENDING_CONFIRMATION">Priced Pending Confirmation</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELED">Canceled</option>
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                    Apply
                  </button>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>
              New Order
            </button>
          </div>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Batch Code</th>
              <th>Product</th>
              <th>Status</th>
              <th>Delivery Progress</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment Method</th>
              <th>Paid Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="no-results">
                  No matching results
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.shortId}</td>
                  <td>{o.batch}</td>
                  <td>{o.product}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <StatusBadge status={o.delivery} />
                    <ProgressBar percent={o.progress} color={o.color} style={{ marginTop: 6 }} />
                  </td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                  <td>{o.payment}</td>
                  <td>{o.paid}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { useParams } from 'react-router-dom';

interface Order {
  id: string;
  clientId: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number | null;
  paid: number | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  specs: Record<string, any>;
}

interface Batch {
  id: string;
  orderId: string;
  clientId: string;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo: string | null;
  deadline: string | null;
  status: string;
  notes: string;
}

interface Client {
  id: string;
  name: string;
}

export default function EditOrder() {
  const { id: orderId } = useParams<{ id: string }>();
  const { goBack } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client: '',
    batch: '',
    status: '',
    product: '',
    qty: '',
    deadline: ''
  });

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/clients.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, clientsData]) => {
        const orders: Order[] = ordersData;
        const batches: Batch[] = batchesData;
        const clients: Client[] = clientsData;

        const order = orders.find(o => o.id === orderId);
        if (!order) {
          setError(`Order ${orderId} not found.`);
          setLoading(false);
          return;
        }

        const batch = batches.find(b => b.orderId === order.id);
        const client = clients.find(c => c.id === order.clientId);

        // Format deadline for date input (YYYY-MM-DD)
        let deadlineFormatted = '';
        if (batch?.deadline) {
          const d = new Date(batch.deadline);
          if (!isNaN(d.getTime())) {
            deadlineFormatted = d.toISOString().slice(0, 10);
          }
        }

        setForm({
          client: client ? client.name : 'Unknown Client',
          batch: batch ? batch.id : '—',
          status: order.status,
          product: order.product,
          qty: batch ? batch.qty.toString() : (order.specs?.qty?.toString() || ''),
          deadline: deadlineFormatted
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load order details:', err);
        setError('Could not load order details. Please try again later.');
        setLoading(false);
      });
  }, [orderId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title={`Edit Order #${orderId ?? ''}`} />
        <section className="box">
          <div className="loading-state">Loading order details...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title={`Edit Order #${orderId ?? ''}`} />
        <section className="box">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={`Edit Order #${orderId ?? ''}`} />
      <section className="box">
        <div className="form-grid">
          <div className="field">
            <label>Client Name</label>
            <input className="input" type="text" value={form.client} onChange={set('client')} />
          </div>
          <div className="field">
            <label>Batch Code</label>
            <input className="input" type="text" value={form.batch} onChange={set('batch')} />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="unpriced_pending">Unpriced Pending</option>
              <option value="priced_pending_confirmation">Priced Pending Confirmation</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div className="field">
            <label>Product</label>
            <input className="input" type="text" value={form.product} onChange={set('product')} />
          </div>
          <div className="field">
            <label>Quantity</label>
            <input className="input" type="number" value={form.qty} onChange={set('qty')} />
          </div>
          <div className="field">
            <label>Deadline</label>
            <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
        </div>
        <div className="line" />
        <div className="actions-inline">
          {/* In a real app, you would send the updated data to the server here */}
          <button className="btn primary" onClick={() => goBack()}>Save Changes</button>
          <button className="btn" onClick={() => goBack()}>Cancel</button>
        </div>
      </section>
    </AppShell>
  );
}
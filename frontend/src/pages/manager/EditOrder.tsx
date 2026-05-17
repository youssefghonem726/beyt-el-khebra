import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { useParams } from 'react-router-dom';
// Direct service imports – bypasses VITE_USE_MOCK
import { getOrderById, updateOrder } from '../../lib/api/ordersQuotesService';
import { getBatches, updateBatch } from '../../lib/api/batchesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

export default function EditOrder() {
  const { id: orderId } = useParams<{ id: string }>();
  const { goBack } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [form, setForm] = useState({
    client: '',
    status: '',
    product: '',
    qty: '',
    deadline: '',
    priority: '',
    assignedTo: '',
    notes: '',
  });

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const numericId = parseInt(orderId, 10);
        if (isNaN(numericId)) {
          setError(`Invalid order ID: ${orderId}`);
          setLoading(false);
          return;
        }

        const [orderRes, batchesRes, clientsRes] = await Promise.all([
          getOrderById(numericId),
          getBatches(),
          getClients(),
        ]);

        const order = orderRes.data.data;
        const batches = batchesRes.data.data || [];
        const clients = clientsRes.data.data.results;

        // Find matching batch
        const batch = batches.find((b: any) => b.orderId === order.id || b.order_id === order.id);
        if (batch) setBatchId(batch.id);

        // Find client name
        const client = clients.find((c: any) => c.id === order.customer);
        const clientName = client?.name || 'Unknown';

        // Format deadline for date input
        let deadlineFormatted = '';
        if (batch?.deadline) {
          const d = new Date(batch.deadline);
          if (!isNaN(d.getTime())) deadlineFormatted = d.toISOString().slice(0, 10);
        }

        setForm({
          client: clientName,
          status: order.status,
          product: batch?.product || order.upload?.file_name || `Order #${order.id}`,
          qty: batch?.qty ? String(batch.qty) : (order.quantity ? String(order.quantity) : ''),
          deadline: deadlineFormatted,
          priority: batch?.priority || 'Normal',
          assignedTo: batch?.assignedTo || '',
          notes: batch?.notes || '',
        });
      } catch (err: any) {
        console.error('Failed to load order:', err);
        setError('Could not load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      const numericId = parseInt(orderId, 10);

      // Update order status
      await updateOrder(numericId, { status: form.status });

      // Update batch if one exists
      if (batchId) {
        await updateBatch(batchId, {
          product: form.product,
          qty: form.qty ? parseInt(form.qty) : undefined,
          deadline: form.deadline || undefined,
          priority: form.priority,
          assignedTo: form.assignedTo || undefined,
          notes: form.notes,
        });
      }

      goBack();
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
            <input className="input" type="text" value={form.client} disabled />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="UNPRICED_PENDING">Unpriced Pending</option>
              <option value="PRICED_PENDING_CONFIRMATION">Priced Pending Confirmation</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELED">Canceled</option>
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
          <div className="field">
            <label>Priority</label>
            <select className="select" value={form.priority} onChange={set('priority')}>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <div className="field">
            <label>Assigned To</label>
            <input className="input" type="text" value={form.assignedTo} onChange={set('assignedTo')} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea className="textarea" value={form.notes} onChange={set('notes')} rows={3} />
          </div>
        </div>
        <div className="line" />
        <div className="actions-inline">
          <button className="btn primary" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn" onClick={() => goBack()}>Cancel</button>
        </div>
      </section>
    </AppShell>
  );
}
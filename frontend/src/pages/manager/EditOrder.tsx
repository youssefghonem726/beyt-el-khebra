import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { useParams } from 'react-router-dom';
import { getOrderById, updateOrder } from '../../lib/api/ordersQuotesService';
import { getBatches, updateBatch } from '../../lib/api/batchesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

export default function EditOrder() {
  return (
    <Suspense fallback={null}>
      <EditOrderInner />
    </Suspense>
  );
}

function EditOrderInner() {
  const { t } = useTranslation(['common', 'editOrder']);
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
      setError(t('editOrder:errors.noId'));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const numericId = parseInt(orderId, 10);
        if (isNaN(numericId)) {
          setError(t('editOrder:errors.noId'));
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

        const batch = batches.find((b: any) => b.orderId === order.id || b.order_id === order.id);
        if (batch) setBatchId(batch.id);

        const client = clients.find((c: any) => c.id === order.customer);
        const clientName = client?.name || 'Unknown';

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
        setError(t('editOrder:errors.loadFailed'));
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

      await updateOrder(numericId, { status: form.status });

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
      setError(t('editOrder:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title={t('editOrder:title', { orderId: orderId ?? '' })} />
        <section className="box">
          <div className="loading-state">{t('editOrder:loading')}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="manager" activePage="manager-orders">
        <Topbar title={t('editOrder:title', { orderId: orderId ?? '' })} />
        <section className="box">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={t('editOrder:title', { orderId: orderId ?? '' })} />
      <section className="box">
        <div className="form-grid">
          <div className="field">
            <label>{t('editOrder:fields.client')}</label>
            <input className="input" type="text" value={form.client} disabled />
          </div>
          <div className="field">
            <label>{t('editOrder:fields.status')}</label>
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="UNPRICED_PENDING">{t('common:status.UNPRICED_PENDING')}</option>
              <option value="PRICED_PENDING_CONFIRMATION">{t('common:status.PRICED_PENDING_CONFIRMATION')}</option>
              <option value="IN_PROGRESS">{t('common:status.IN_PROGRESS')}</option>
              <option value="COMPLETED">{t('common:status.COMPLETED')}</option>
              <option value="CANCELED">{t('common:status.CANCELED')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('editOrder:fields.product')}</label>
            <input className="input" type="text" value={form.product} onChange={set('product')} />
          </div>
          <div className="field">
            <label>{t('editOrder:fields.qty')}</label>
            <input className="input" type="number" value={form.qty} onChange={set('qty')} />
          </div>
          <div className="field">
            <label>{t('editOrder:fields.deadline')}</label>
            <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <div className="field">
            <label>{t('editOrder:fields.priority')}</label>
            <select className="select" value={form.priority} onChange={set('priority')}>
              <option value="Normal">{t('editOrder:priority.Normal')}</option>
              <option value="High">{t('editOrder:priority.High')}</option>
              <option value="Urgent">{t('editOrder:priority.Urgent')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('editOrder:fields.assignedTo')}</label>
            <input className="input" type="text" value={form.assignedTo} onChange={set('assignedTo')} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>{t('editOrder:fields.notes')}</label>
            <textarea className="textarea" value={form.notes} onChange={set('notes')} rows={3} />
          </div>
        </div>
        <div className="line" />
        <div className="actions-inline">
          <button className="btn primary" onClick={handleSave} disabled={submitting}>
            {submitting ? t('editOrder:actions.saving') : t('editOrder:actions.save')}
          </button>
          <button className="btn" onClick={() => goBack()}>{t('editOrder:actions.cancel')}</button>
        </div>
      </section>
    </AppShell>
  );
}

import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { createDelivery } from '../../lib/api/deliveriesService';
import type { Order } from '../../lib/api/types';

interface Props { role?: 'manager' | 'owner'; }

interface BackendBatch {
  id: number;
  orderId: number;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo?: string | null;
  deadline?: string | null;
  status: string;
  stages?: { stage: string; status: string; updatedAt?: string }[];
  notes?: string;
}

interface StageView {
  stage: string;
  status: string;
  updated: string;
}

interface BatchInfo {
  client: string;
  batch: string;
  product: string;
  qty: number;
  status: string;
  priority: string;
  deadline: string;
  team: string;
  completion: string;
  notes: string;
}

interface OrderView {
  id: number;
  client: string;
  product: string;
  completedAt: string;
  handoff: 'delivery' | 'pickup';
  deliveryStatus?: string;
  deliveryId?: number;
  hasBatch: boolean;
  batch?: BackendBatch;        // loaded if available
  stages?: StageView[];        // from batch
  info?: BatchInfo;            // detailed batch info
}

// Helpers – keep locale-aware formatting
function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clientName(order: Order): string {
  return order.customer_name || order.customer_email || `Client #${order.customer}`;
}

// Delivery form state
interface DeliveryFormState {
  address: string;
  phone: string;
  scheduled_date: string;
  driver: string;
  company: string;
  notes: string;
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CompletedJobs({ role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <CompletedJobsInner role={role} />
    </Suspense>
  );
}

function CompletedJobsInner({ role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'completedJobs']);
  const lang = i18n.language;

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delivery creation
  const [deliveryOrder, setDeliveryOrder] = useState<OrderView | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormState>({
    address: '',
    phone: '',
    scheduled_date: todayInputDate(),
    driver: '',
    company: '',
    notes: '',
  });

  // Detail modal for selected order
  const [selectedOrder, setSelectedOrder] = useState<OrderView | null>(null);

  // Load completed orders and merge with batches
  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, batchesRes] = await Promise.all([
          getOrders({ status: 'COMPLETED' }),
          getBatches().catch(() => ({ data: { data: [] } })),
        ]);

        const ordersRaw: Order[] = ordersRes.data.data;
        const batches: BackendBatch[] = batchesRes.data.data || [];

        const orderViews: OrderView[] = ordersRaw.map(order => {
          const delivery = order.delivery_info;
          const batch = batches.find(b => Number(b.orderId) === order.id) || undefined;
          const handoff = delivery ? 'delivery' : 'pickup';
          const completedAt = formatDate(order.completed_at || order.updated_at || null, lang);
          const stages: StageView[] = batch
            ? (batch.stages || []).map(s => ({
                stage: s.stage,
                status: s.status,
                updated: s.updatedAt ? formatDateTime(s.updatedAt, lang) : '—',
              }))
            : [];

          let info: BatchInfo | undefined;
          if (batch) {
            const client = clientName(order);
            const deadline = batch.deadline ? formatDate(batch.deadline, lang) : '—';
            info = {
              client,
              batch: String(batch.id),
              product: batch.product,
              qty: batch.qty,
              status: 'completed',
              priority: batch.priority,
              deadline,
              team: batch.assignedTo || 'Unassigned',
              completion: formatDate(order.completed_at || order.updated_at || null, lang),
              notes: batch.notes || '—',
            };
          }

          return {
            id: order.id,
            client: clientName(order),
            product: order.product_summary || `Order #${order.id}`,
            completedAt,
            handoff,
            deliveryStatus: delivery?.status,
            deliveryId: delivery?.id,
            hasBatch: !!batch,
            batch,
            stages,
            info,
          };
        });

        setOrders(orderViews);
      } catch (err: any) {
        console.error('Failed to load completed orders:', err);
        setError(t('completedJobs:error'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Refresh orders after delivery creation
  const refreshOrders = async () => {
    const response = await getOrders({ status: 'COMPLETED' });
    const ordersRaw: Order[] = response.data.data;
    const batches: BackendBatch[] = (await getBatches().catch(() => ({ data: { data: [] } }))).data.data || [];
    setOrders(ordersRaw.map(order => {
      const delivery = order.delivery_info;
      const batch = batches.find(b => Number(b.orderId) === order.id) || undefined;
      const handoff = delivery ? 'delivery' : 'pickup';
      const completedAt = formatDate(order.completed_at || order.updated_at || null, lang);
      const stages: StageView[] = batch
        ? (batch.stages || []).map(s => ({
            stage: s.stage,
            status: s.status,
            updated: s.updatedAt ? formatDateTime(s.updatedAt, lang) : '—',
          }))
        : [];

      let info: BatchInfo | undefined;
      if (batch) {
        const client = clientName(order);
        const deadline = batch.deadline ? formatDate(batch.deadline, lang) : '—';
        info = {
          client,
          batch: String(batch.id),
          product: batch.product,
          qty: batch.qty,
          status: 'completed',
          priority: batch.priority,
          deadline,
          team: batch.assignedTo || 'Unassigned',
          completion: formatDate(order.completed_at || order.updated_at || null, lang),
          notes: batch.notes || '—',
        };
      }

      return {
        id: order.id,
        client: clientName(order),
        product: order.product_summary || `Order #${order.id}`,
        completedAt,
        handoff,
        deliveryStatus: delivery?.status,
        deliveryId: delivery?.id,
        hasBatch: !!batch,
        batch,
        stages,
        info,
      };
    }));
  };

  const openDeliveryForm = (orderView: OrderView) => {
    setDeliveryOrder(orderView);
    setDeliveryForm({
      address: '',
      phone: '',
      scheduled_date: todayInputDate(),
      driver: '',
      company: '',
      notes: '',
    });
    setError(null);
  };

  const handleCreateDelivery = async () => {
    if (!deliveryOrder) return;

    if (!deliveryForm.address.trim()) {
      setError(t('completedJobs:delivery.addressRequired'));
      return;
    }
    if (!deliveryForm.phone.trim()) {
      setError(t('completedJobs:delivery.phoneRequired'));
      return;
    }
    if (!deliveryForm.scheduled_date) {
      setError(t('completedJobs:delivery.dateRequired'));
      return;
    }

    setSavingOrderId(deliveryOrder.id);
    setError(null);
    try {
      await createDelivery({
        order_id: deliveryOrder.id,
        address: deliveryForm.address.trim(),
        phone: deliveryForm.phone.trim(),
        scheduled_date: deliveryForm.scheduled_date,
        driver: deliveryForm.driver.trim(),
        company: deliveryForm.company.trim(),
        notes: deliveryForm.notes.trim(),
      });
      setDeliveryOrder(null);
      await refreshOrders();
    } catch (err) {
      console.error('Failed to create delivery:', err);
      setError(t('completedJobs:delivery.error'));
    } finally {
      setSavingOrderId(null);
    }
  };

  const activePage = role === 'owner' ? 'owner-dashboard' : 'completed-jobs';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('completedJobs:title')} />
        <div className="loading-state">{t('completedJobs:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={t('completedJobs:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head">
          <h3>{t('completedJobs:list.title')}</h3>
          <p className="muted">{t('completedJobs:list.subtitle')}</p>
        </div>

        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('completedJobs:table.order')}</th>
                <th>{t('completedJobs:table.client')}</th>
                <th>{t('completedJobs:table.product')}</th>
                <th>{t('completedJobs:table.completedAt')}</th>
                <th>{t('completedJobs:table.handoff')}</th>
                <th>{t('completedJobs:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-results">
                    {t('completedJobs:empty')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const delivery = order.deliveryStatus ? { id: order.deliveryId, status: order.deliveryStatus } : undefined;
                  return (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.client}</td>
                      <td>{order.product}</td>
                      <td>{order.completedAt}</td>
                      <td>
                        {delivery ? (
                          <StatusBadge status={delivery.status} />
                        ) : (
                          <StatusBadge status="pickup_ready" />
                        )}
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        {order.hasBatch && (
                          <button
                            className="btn"
                            onClick={() => setSelectedOrder(order)}
                          >
                            {t('completedJobs:actions.details')}
                          </button>
                        )}
                        {delivery ? (
                          <span className="muted">
                            {t('completedJobs:delivery.created', { id: delivery.id })}
                          </span>
                        ) : (
                          <button
                            className="btn primary"
                            disabled={savingOrderId === order.id}
                            onClick={() => openDeliveryForm(order)}
                          >
                            {t('completedJobs:actions.createDelivery')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delivery creation modal */}
      {deliveryOrder && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        }}>
          <div className="box" style={{ width: '100%', maxWidth: 620 }}>
            <div className="table-head" style={{ marginBottom: 12 }}>
              <div>
                <h3>{t('completedJobs:delivery.modal.title')}</h3>
                <p className="muted">
                  {t('completedJobs:delivery.modal.order', { id: deliveryOrder.id, client: deliveryOrder.client })}
                </p>
              </div>
              <button className="btn" onClick={() => setDeliveryOrder(null)}>
                {t('completedJobs:modal.close')}
              </button>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label>{t('completedJobs:delivery.form.address')}</label>
                <input
                  className="input"
                  value={deliveryForm.address}
                  onChange={e => setDeliveryForm(f => ({ ...f, address: e.target.value }))}
                  placeholder={t('completedJobs:delivery.form.addressPlaceholder')}
                />
              </div>
              <div className="field">
                <label>{t('completedJobs:delivery.form.phone')}</label>
                <input
                  className="input"
                  value={deliveryForm.phone}
                  onChange={e => setDeliveryForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder={t('completedJobs:delivery.form.phonePlaceholder')}
                />
              </div>
              <div className="field">
                <label>{t('completedJobs:delivery.form.date')}</label>
                <input
                  className="input"
                  type="date"
                  value={deliveryForm.scheduled_date}
                  onChange={e => setDeliveryForm(f => ({ ...f, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>{t('completedJobs:delivery.form.driver')}</label>
                <input
                  className="input"
                  value={deliveryForm.driver}
                  onChange={e => setDeliveryForm(f => ({ ...f, driver: e.target.value }))}
                  placeholder={t('completedJobs:delivery.form.driverPlaceholder')}
                />
              </div>
              <div className="field">
                <label>{t('completedJobs:delivery.form.company')}</label>
                <input
                  className="input"
                  value={deliveryForm.company}
                  onChange={e => setDeliveryForm(f => ({ ...f, company: e.target.value }))}
                  placeholder={t('completedJobs:delivery.form.companyPlaceholder')}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('completedJobs:delivery.form.notes')}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={deliveryForm.notes}
                  onChange={e => setDeliveryForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t('completedJobs:delivery.form.notesPlaceholder')}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn" onClick={() => setDeliveryOrder(null)}>
                {t('completedJobs:modal.cancel')}
              </button>
              <button
                className="btn primary"
                disabled={savingOrderId === deliveryOrder.id}
                onClick={handleCreateDelivery}
              >
                {savingOrderId === deliveryOrder.id
                  ? t('completedJobs:delivery.saving')
                  : t('completedJobs:delivery.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch/order detail modal */}
      {selectedOrder && selectedOrder.info && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
        >
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 660, boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {t('completedJobs:detail.title', { id: selectedOrder.id })}
              </h2>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {t('completedJobs:modal.close')}
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ fontSize: 13 }}>
                  {t('completedJobs:detail.order', { id: selectedOrder.id })} · {selectedOrder.completedAt}
                </p>
                <StatusBadge status="completed" />
              </div>

              <h4 style={{ marginBottom: 8 }}>{t('completedJobs:detail.info')}</h4>
              <div className="form-grid-2" style={{ fontSize: 13, gap: 6, marginBottom: 14 }}>
                <p><strong>{t('completedJobs:detail.client')}:</strong> {selectedOrder.info.client}</p>
                <p><strong>{t('completedJobs:detail.batch')}:</strong> {selectedOrder.info.batch}</p>
                <p><strong>{t('completedJobs:detail.product')}:</strong> {selectedOrder.info.product}</p>
                <p><strong>{t('completedJobs:detail.quantity')}:</strong> {selectedOrder.info.qty}</p>
                <p><strong>{t('completedJobs:detail.status')}:</strong> {t('common:status.completed')}</p>
                <p><strong>{t('completedJobs:detail.priority')}:</strong> {selectedOrder.info.priority}</p>
                <p><strong>{t('completedJobs:detail.deadline')}:</strong> {selectedOrder.info.deadline}</p>
                <p><strong>{t('completedJobs:detail.assignedTo')}:</strong> {selectedOrder.info.team}</p>
                <p><strong>{t('completedJobs:detail.completionDate')}:</strong> {selectedOrder.info.completion}</p>
                <p><strong>{t('completedJobs:detail.notes')}:</strong> {selectedOrder.info.notes}</p>
              </div>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>{t('completedJobs:detail.stages')}</h4>
              {selectedOrder.stages && selectedOrder.stages.length > 0 ? (
                <table style={{ marginBottom: 14 }}>
                  <thead>
                    <tr>
                      <th>{t('completedJobs:detail.stage')}</th>
                      <th>{t('completedJobs:detail.status')}</th>
                      <th>{t('completedJobs:detail.updatedAt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.stages.map(s => (
                      <tr key={s.stage}>
                        <td>{s.stage}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>{s.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">{t('completedJobs:detail.noStages')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
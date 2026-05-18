import { useState, useEffect, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import {
  createDelivery,
  getDeliveries,
  getDeliveryReadyOrders,
  updateDelivery,
  type DeliveryResponse,
  type DeliveryStatus,
} from '../../lib/api/deliveriesService';
import type { Order } from '../../lib/api/types';

type DeliveryForm = {
  orderId: number;
  address: string;
  driver: string;
  company: string;
  phone: string;
  scheduledDate: string;
  notes: string;
};

const DELIVERY_STATUS_VALUES: DeliveryStatus[] = [
  'pending',
  'out_for_delivery',
  'delivered',
  'delayed',
  'lost',
];

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results as T[];
  }
  return [];
}

function formatDate(value: string | null | undefined, lang: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function progressColor(status: string): 'green' | 'orange' | 'red' {
  if (status === 'delayed') return 'orange';
  if (status === 'lost' || status === 'lost_in_transit') return 'red';
  return 'green';
}

function orderClientName(order: Order): string {
  return order.customer_name || order.customer_email || `Client #${order.customer}`;
}

function productSummary(order: Order): string {
  if (order.product_summary) return order.product_summary;
  if (order.item_details?.length) {
    return order.item_details
      .map(item => `${item.item_type || 'Order Item'} (${item.quantity || 1} pcs)`)
      .join(', ');
  }
  return `Order #${order.id}`;
}

function emptyForm(order: Order): DeliveryForm {
  return {
    orderId: order.id,
    address: '',
    driver: '',
    company: '',
    phone: '',
    scheduledDate: order.due_date ? order.due_date.slice(0, 10) : '',
    notes: '',
  };
}

export default function DeliveryTracking() {
  return (
    <Suspense fallback={null}>
      <DeliveryTrackingInner />
    </Suspense>
  );
}

function DeliveryTrackingInner() {
  const { t, i18n } = useTranslation(['common', 'deliveryTracking']);
  const { navigateTopLevel: _nav } = useNavigation();
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<DeliveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm | null>(null);
  const [addressEdit, setAddressEdit] = useState('');
  const [notesEdit, setNotesEdit] = useState('');

  const statusOptions = DELIVERY_STATUS_VALUES.map(value => ({
    value,
    label: t(`deliveryTracking:statusOptions.${value}`),
  }));

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [deliveriesRes, readyOrdersRes] = await Promise.all([
        getDeliveries(),
        getDeliveryReadyOrders(),
      ]);

      const deliveryList = unwrapList<DeliveryResponse>(deliveriesRes.data.data);
      const orderList = unwrapList<Order>(readyOrdersRes.data.data);

      setDeliveries(deliveryList);
      setReadyOrders(orderList);
      setSelected(current => {
        if (!current) return deliveryList[0] ?? null;
        return deliveryList.find(item => item.id === current.id) ?? deliveryList[0] ?? null;
      });
    } catch (err) {
      console.error('Failed to load delivery data:', err);
      setError(t('deliveryTracking:error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredDeliveries = useMemo(() => {
    const q = query.trim().toLowerCase();

    return deliveries.filter(delivery => {
      const matchesQuery =
        !q ||
        String(delivery.orderId).includes(q) ||
        String(delivery.id).includes(q) ||
        (delivery.clientName || '').toLowerCase().includes(q) ||
        delivery.status.toLowerCase().includes(q);

      const matchesStatus = !filterStatus || delivery.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
  }, [deliveries, filterStatus, query]);

  const stats = useMemo(() => {
    const onTimeStatuses = ['pending', 'out_for_delivery', 'scheduled', 'in_transit'];
    return {
      total: deliveries.length,
      onTime: deliveries.filter(item => onTimeStatuses.includes(item.status)).length,
      delivered: deliveries.filter(item => item.status === 'delivered').length,
      delayed: deliveries.filter(item => item.status === 'delayed').length,
      lost: deliveries.filter(item => item.status === 'lost' || item.status === 'lost_in_transit').length,
    };
  }, [deliveries]);

  const saveDeliveryStatus = async (delivery: DeliveryResponse, status: DeliveryStatus) => {
    setSaving(true);
    try {
      const res = await updateDelivery(delivery.id, { status });
      setDeliveries(items => items.map(item => (item.id === delivery.id ? res.data.data : item)));
      setSelected(res.data.data);
      setToast(t('deliveryTracking:toast.statusUpdated', { orderId: String(delivery.orderId) }));
    } catch (err) {
      console.error('Failed to update delivery:', err);
      setToast(t('deliveryTracking:toast.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await updateDelivery(selected.id, { address: addressEdit.trim() || t('deliveryTracking:detail.addressMissing') });
      setDeliveries(items => items.map(item => (item.id === selected.id ? res.data.data : item)));
      setSelected(res.data.data);
      setAddressEdit('');
      setToast(t('deliveryTracking:toast.addressSaved', { orderId: String(selected.orderId) }));
    } catch (err) {
      console.error('Failed to update delivery address:', err);
      setToast(t('deliveryTracking:toast.addressError'));
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await updateDelivery(selected.id, { notes: notesEdit.trim() });
      setDeliveries(items => items.map(item => (item.id === selected.id ? res.data.data : item)));
      setSelected(res.data.data);
      setNotesEdit('');
      setToast(t('deliveryTracking:toast.notesSaved', { orderId: String(selected.orderId) }));
    } catch (err) {
      console.error('Failed to update delivery notes:', err);
      setToast(t('deliveryTracking:toast.notesError'));
    } finally {
      setSaving(false);
    }
  };

  const submitCreateDelivery = async () => {
    if (!deliveryForm) return;

    setSaving(true);
    try {
      const res = await createDelivery({
        order_id: deliveryForm.orderId,
        address: deliveryForm.address.trim() || t('deliveryTracking:detail.addressMissing'),
        driver: deliveryForm.driver.trim() || t('deliveryTracking:detail.unassigned'),
        company: deliveryForm.company.trim(),
        phone: deliveryForm.phone.trim(),
        scheduled_date: deliveryForm.scheduledDate || undefined,
        notes: deliveryForm.notes.trim(),
      });

      setDeliveryForm(null);
      setSelected(res.data.data);
      setToast(t('deliveryTracking:toast.created', { orderId: String(res.data.data.orderId) }));
      await loadData();
    } catch (err) {
      console.error('Failed to create delivery:', err);
      setToast(t('deliveryTracking:toast.createError'));
    } finally {
      setSaving(false);
    }
  };

  const lang = i18n.language;

  if (loading) {
    return (
      <AppShell role="owner" activePage="delivery-tracking">
        <Topbar title={t('deliveryTracking:title')} />
        <div className="loading-state">{t('deliveryTracking:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="delivery-tracking">
        <Topbar title={t('deliveryTracking:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="delivery-tracking">
      <Topbar title={t('deliveryTracking:title')} />

      <section className="grid-4 delivery-stats-grid" style={{ marginBottom: 14 }}>
        <StatCard label={t('deliveryTracking:stats.total')} value={stats.total} sub={t('deliveryTracking:stats.totalSub')} />
        <StatCard label={t('deliveryTracking:stats.onTime')} value={stats.onTime} sub={t('deliveryTracking:stats.onTimeSub')} />
        <StatCard label={t('deliveryTracking:stats.delivered')} value={stats.delivered} sub={t('deliveryTracking:stats.deliveredSub')} />
        <StatCard label={t('deliveryTracking:stats.delayed')} value={stats.delayed} sub={t('deliveryTracking:stats.delayedSub')} />
        <StatCard label={t('deliveryTracking:stats.lost')} value={stats.lost} sub={t('deliveryTracking:stats.lostSub')} />
      </section>

      <section className="box" style={{ marginBottom: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>{t('deliveryTracking:readyOrders.title')}</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              {t('deliveryTracking:readyOrders.subtitle')}
            </p>
          </div>
        </div>

        {readyOrders.length === 0 ? (
          <p className="muted">{t('deliveryTracking:readyOrders.empty')}</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('deliveryTracking:readyOrders.colOrder')}</th>
                <th>{t('deliveryTracking:readyOrders.colClient')}</th>
                <th>{t('deliveryTracking:readyOrders.colProducts')}</th>
                <th>{t('deliveryTracking:readyOrders.colCompleted')}</th>
                <th>{t('deliveryTracking:readyOrders.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {readyOrders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{orderClientName(order)}</td>
                  <td>{productSummary(order)}</td>
                  <td>{formatDate(order.completed_at || order.updated_at || order.created_at, lang)}</td>
                  <td>
                    <button className="btn" onClick={() => setDeliveryForm(emptyForm(order))}>
                      {t('deliveryTracking:readyOrders.createDelivery')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="production-layout">
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>{t('deliveryTracking:table.title')}</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder={t('deliveryTracking:table.searchPlaceholder')}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen(open => !open)}>
                  v
                </button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>{t('deliveryTracking:table.filter.label')}</label>
                      <select className="select" value={filterStatus} onChange={event => setFilterStatus(event.target.value)}>
                        <option value="">{t('deliveryTracking:table.filter.all')}</option>
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                      {t('deliveryTracking:table.filter.apply')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filteredDeliveries.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>{t('deliveryTracking:table.empty')}</p>
              ) : (
                filteredDeliveries.map(delivery => (
                  <article
                    key={delivery.id}
                    className={`card${selected?.id === delivery.id ? ' card--selected' : ''}`}
                    onClick={() => {
                      setSelected(delivery);
                      setAddressEdit('');
                      setNotesEdit('');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h4>Order #{delivery.orderId}</h4>
                      <StatusBadge status={delivery.status} />
                    </div>
                    <p style={{ marginBottom: 2 }}>
                      <strong>{t('deliveryTracking:card.client')}:</strong>{' '}
                      {delivery.clientName || `Client #${delivery.clientId}`}
                    </p>
                    <p style={{ marginBottom: 2 }}>
                      <strong>{t('deliveryTracking:card.driver')}:</strong>{' '}
                      {delivery.driver || t('deliveryTracking:card.unassigned')} -{' '}
                      {delivery.company || t('deliveryTracking:card.noCompany')}
                    </p>
                    <p style={{ marginBottom: 2 }}>
                      <strong>{t('deliveryTracking:card.scheduled')}:</strong>{' '}
                      {formatDate(delivery.scheduledDate, lang)}
                    </p>
                    <p style={{ marginBottom: 6 }}>
                      <strong>{t('deliveryTracking:card.address')}:</strong>{' '}
                      {delivery.address || t('deliveryTracking:card.addressMissing')}
                    </p>
                    {delivery.notes && (
                      <p style={{ marginBottom: 6 }}>
                        <strong>{t('deliveryTracking:card.notes')}:</strong> {delivery.notes}
                      </p>
                    )}
                    <ProgressBar percent={delivery.progress || 0} color={progressColor(delivery.status)} />
                    <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                      {t('deliveryTracking:card.deliveryProgress', { percent: String(delivery.progress || 0) })}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>
        </div>

        {selected && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>Order #{selected.orderId}</h3>
              <StatusBadge status={selected.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              {selected.clientName || `Client #${selected.clientId}`}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.heading')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('deliveryTracking:detail.trackingId')}:</strong> {selected.id}</li>
              <li><strong>{t('deliveryTracking:detail.address')}:</strong> {selected.address || t('deliveryTracking:detail.addressMissing')}</li>
              <li><strong>{t('deliveryTracking:detail.driver')}:</strong> {selected.driver || t('deliveryTracking:detail.unassigned')}</li>
              <li><strong>{t('deliveryTracking:detail.company')}:</strong> {selected.company || t('deliveryTracking:detail.noValue')}</li>
              <li><strong>{t('deliveryTracking:detail.phone')}:</strong> {selected.phone || t('deliveryTracking:detail.noValue')}</li>
              <li><strong>{t('deliveryTracking:detail.scheduled')}:</strong> {formatDate(selected.scheduledDate, lang)}</li>
              <li><strong>{t('deliveryTracking:detail.deliveredAt')}:</strong> {formatDate(selected.deliveredAt, lang)}</li>
              <li><strong>{t('deliveryTracking:detail.notes')}:</strong> {selected.notes || t('deliveryTracking:detail.noValue')}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.progress')}</h4>
            <ProgressBar percent={selected.progress || 0} color={progressColor(selected.status)} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {t('deliveryTracking:detail.progressPct', { percent: String(selected.progress || 0) })}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.updateStatus')}</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  className={`btn block${selected.status === option.value ? ' primary' : ''}`}
                  disabled={saving || selected.status === option.value}
                  onClick={() => saveDeliveryStatus(selected, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.addressSection.label')}</h4>
            <input
              className="input"
              value={addressEdit}
              placeholder={selected.address || t('deliveryTracking:detail.addressSection.placeholder')}
              onChange={event => setAddressEdit(event.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <button
              className="btn block"
              disabled={saving || !addressEdit.trim()}
              onClick={saveAddress}
            >
              {t('deliveryTracking:detail.addressSection.save')}
            </button>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.notesSection.label')}</h4>
            <textarea
              className="textarea"
              value={notesEdit}
              placeholder={selected.notes || t('deliveryTracking:detail.notesSection.placeholder')}
              onChange={event => setNotesEdit(event.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <button
              className="btn block"
              disabled={saving}
              onClick={saveNotes}
            >
              {t('deliveryTracking:detail.notesSection.save')}
            </button>
          </aside>
        )}
      </section>

      {deliveryForm && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 620 }}>
            <div className="modal-head">
              <h2>{t('deliveryTracking:modal.title', { orderId: String(deliveryForm.orderId) })}</h2>
              <button className="btn dark" onClick={() => setDeliveryForm(null)}>
                {t('deliveryTracking:modal.close')}
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <label className="field">
                  <span>{t('deliveryTracking:modal.address')}</span>
                  <input
                    className="input"
                    value={deliveryForm.address}
                    placeholder={t('deliveryTracking:modal.addressPlaceholder')}
                    onChange={event => setDeliveryForm({ ...deliveryForm, address: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('deliveryTracking:modal.scheduledDate')}</span>
                  <input
                    className="input"
                    type="date"
                    value={deliveryForm.scheduledDate}
                    onChange={event => setDeliveryForm({ ...deliveryForm, scheduledDate: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('deliveryTracking:modal.driver')}</span>
                  <input
                    className="input"
                    value={deliveryForm.driver}
                    placeholder={t('deliveryTracking:modal.driverPlaceholder')}
                    onChange={event => setDeliveryForm({ ...deliveryForm, driver: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('deliveryTracking:modal.company')}</span>
                  <input
                    className="input"
                    value={deliveryForm.company}
                    placeholder={t('deliveryTracking:modal.companyPlaceholder')}
                    onChange={event => setDeliveryForm({ ...deliveryForm, company: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('deliveryTracking:modal.phone')}</span>
                  <input
                    className="input"
                    value={deliveryForm.phone}
                    placeholder={t('deliveryTracking:modal.phonePlaceholder')}
                    onChange={event => setDeliveryForm({ ...deliveryForm, phone: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('deliveryTracking:modal.notes')}</span>
                  <textarea
                    className="textarea"
                    value={deliveryForm.notes}
                    placeholder={t('deliveryTracking:modal.notesPlaceholder')}
                    onChange={event => setDeliveryForm({ ...deliveryForm, notes: event.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={() => setDeliveryForm(null)}>
                  {t('deliveryTracking:modal.cancel')}
                </button>
                <button className="btn primary" disabled={saving} onClick={submitCreateDelivery}>
                  {saving ? t('deliveryTracking:modal.creating') : t('deliveryTracking:modal.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#2f3640',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          fontSize: 13,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}

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

const STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'lost', label: 'Lost' },
];

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results as T[];
  }
  return [];
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
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
  const { t } = useTranslation(['common', 'deliveryTracking']);
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
      setError('Could not load delivery data. Please try again later.');
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
      setToast(`Order #${delivery.orderId} delivery updated.`);
    } catch (err) {
      console.error('Failed to update delivery:', err);
      setToast('Could not update delivery.');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await updateDelivery(selected.id, { address: addressEdit.trim() || 'Address missing' });
      setDeliveries(items => items.map(item => (item.id === selected.id ? res.data.data : item)));
      setSelected(res.data.data);
      setAddressEdit('');
      setToast(`Order #${selected.orderId} address updated.`);
    } catch (err) {
      console.error('Failed to update delivery address:', err);
      setToast('Could not update delivery address.');
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
      setToast(`Order #${selected.orderId} notes updated.`);
    } catch (err) {
      console.error('Failed to update delivery notes:', err);
      setToast('Could not update delivery notes.');
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
        address: deliveryForm.address.trim() || 'Address missing',
        driver: deliveryForm.driver.trim() || 'Unassigned',
        company: deliveryForm.company.trim(),
        phone: deliveryForm.phone.trim(),
        scheduled_date: deliveryForm.scheduledDate || undefined,
        notes: deliveryForm.notes.trim(),
      });

      setDeliveryForm(null);
      setSelected(res.data.data);
      setToast(`Delivery created for order #${res.data.data.orderId}.`);
      await loadData();
    } catch (err) {
      console.error('Failed to create delivery:', err);
      setToast('Could not create delivery for this order.');
    } finally {
      setSaving(false);
    }
  };

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
        <StatCard label="Total Deliveries" value={stats.total} sub="Created deliveries" />
        <StatCard label="On Time" value={stats.onTime} sub="Pending or out for delivery" />
        <StatCard label="Delivered" value={stats.delivered} sub="Completed handoffs" />
        <StatCard label="Delayed" value={stats.delayed} sub="Needs follow-up" />
        <StatCard label="Lost in Transit" value={stats.lost} sub="Needs immediate action" />
      </section>

      <section className="box" style={{ marginBottom: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Delivery-Ready Orders</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Completed orders stay here until the owner chooses shipping. Pickup orders can stay completed without delivery.
            </p>
          </div>
        </div>

        {readyOrders.length === 0 ? (
          <p className="muted">No completed orders waiting for delivery creation.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Products</th>
                <th>Completed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {readyOrders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{orderClientName(order)}</td>
                  <td>{productSummary(order)}</td>
                  <td>{formatDate(order.completed_at || order.updated_at || order.created_at)}</td>
                  <td>
                    <button className="btn" onClick={() => setDeliveryForm(emptyForm(order))}>
                      Create Delivery
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
                  placeholder="Search by order, client or status..."
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen(open => !open)}>
                  v
                </button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>Status</label>
                      <select className="select" value={filterStatus} onChange={event => setFilterStatus(event.target.value)}>
                        <option value="">All</option>
                        {STATUS_OPTIONS.map(option => (
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
                <p className="muted" style={{ padding: '12px 0' }}>No matching deliveries.</p>
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
                    <p style={{ marginBottom: 2 }}><strong>Client:</strong> {delivery.clientName || `Client #${delivery.clientId}`}</p>
                    <p style={{ marginBottom: 2 }}><strong>Driver:</strong> {delivery.driver || 'Unassigned'} - {delivery.company || 'No company'}</p>
                    <p style={{ marginBottom: 2 }}><strong>Scheduled:</strong> {formatDate(delivery.scheduledDate)}</p>
                    <p style={{ marginBottom: 6 }}><strong>Address:</strong> {delivery.address || 'Address missing'}</p>
                    {delivery.notes && (
                      <p style={{ marginBottom: 6 }}><strong>Notes:</strong> {delivery.notes}</p>
                    )}
                    <ProgressBar percent={delivery.progress || 0} color={progressColor(delivery.status)} />
                    <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>{delivery.progress || 0}% delivery progress</p>
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
              <li><strong>Tracking ID:</strong> {selected.id}</li>
              <li><strong>Address:</strong> {selected.address || 'Address missing'}</li>
              <li><strong>Driver:</strong> {selected.driver || 'Unassigned'}</li>
              <li><strong>Company:</strong> {selected.company || '-'}</li>
              <li><strong>Phone:</strong> {selected.phone || '-'}</li>
              <li><strong>Scheduled:</strong> {formatDate(selected.scheduledDate)}</li>
              <li><strong>Delivered:</strong> {formatDate(selected.deliveredAt)}</li>
              <li><strong>Notes:</strong> {selected.notes || '-'}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Progress</h4>
            <ProgressBar percent={selected.progress || 0} color={progressColor(selected.status)} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selected.progress || 0}% complete
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Update Status</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {STATUS_OPTIONS.map(option => (
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

            <h4 style={{ margin: '12px 0 8px' }}>Address</h4>
            <input
              className="input"
              value={addressEdit}
              placeholder={selected.address || 'Address missing'}
              onChange={event => setAddressEdit(event.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <button
              className="btn block"
              disabled={saving || !addressEdit.trim()}
              onClick={saveAddress}
            >
              Save Address
            </button>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Notes</h4>
            <textarea
              className="textarea"
              value={notesEdit}
              placeholder={selected.notes || 'Add delivery notes...'}
              onChange={event => setNotesEdit(event.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <button
              className="btn block"
              disabled={saving}
              onClick={saveNotes}
            >
              Save Notes
            </button>
          </aside>
        )}
      </section>

      {deliveryForm && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 620 }}>
            <div className="modal-head">
              <h2>Create Delivery for Order #{deliveryForm.orderId}</h2>
              <button className="btn dark" onClick={() => setDeliveryForm(null)}>X Close</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <label className="field">
                  <span>Delivery Address</span>
                  <input
                    className="input"
                    value={deliveryForm.address}
                    placeholder="Address missing"
                    onChange={event => setDeliveryForm({ ...deliveryForm, address: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Scheduled Date</span>
                  <input
                    className="input"
                    type="date"
                    value={deliveryForm.scheduledDate}
                    onChange={event => setDeliveryForm({ ...deliveryForm, scheduledDate: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Driver</span>
                  <input
                    className="input"
                    value={deliveryForm.driver}
                    placeholder="Unassigned"
                    onChange={event => setDeliveryForm({ ...deliveryForm, driver: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Company</span>
                  <input
                    className="input"
                    value={deliveryForm.company}
                    placeholder="Optional"
                    onChange={event => setDeliveryForm({ ...deliveryForm, company: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    className="input"
                    value={deliveryForm.phone}
                    placeholder="Optional"
                    onChange={event => setDeliveryForm({ ...deliveryForm, phone: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    className="textarea"
                    value={deliveryForm.notes}
                    placeholder="Optional delivery notes"
                    onChange={event => setDeliveryForm({ ...deliveryForm, notes: event.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={() => setDeliveryForm(null)}>Cancel</button>
                <button className="btn primary" disabled={saving} onClick={submitCreateDelivery}>
                  {saving ? 'Creating...' : 'Create Delivery'}
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
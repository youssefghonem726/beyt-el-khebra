import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';
import { getDeliveries } from '../../lib/api/deliveriesService';
import type { DeliveryResponse } from '../../lib/api/deliveriesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Client {
  id: number | string;
  name: string;
}

interface DisplayDelivery {
  order: string;
  client: string;
  id: string;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: string;
  progress: number;
  color: 'green' | 'orange' | 'red';
}

type ActionPanel = 'reschedule' | 'address' | 'cancel' | null;

function getShortOrderId(orderId: number): string {
  return `#${orderId}`;
}

function getStatusColor(status: string): 'green' | 'orange' | 'red' {
  if (status === 'on_time' || status === 'delivered' || status === 'scheduled') return 'green';
  if (status === 'delayed' || status === 'in_transit') return 'orange';
  return 'red';
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
  const [deliveries, setDeliveries] = useState<DisplayDelivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected]     = useState<DisplayDelivery | null>(null);
  const [activeAction, setActiveAction] = useState<ActionPanel>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [newAddress, setNewAddress]   = useState('');
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deliveriesRes, clientsRes] = await Promise.all([
          getDeliveries(),
          getClients(),
        ]);

        const raw: DeliveryResponse[] = deliveriesRes.data.data;
        const clients: Client[] = clientsRes.data.data.results;

        const clientsMap = new Map<number, string>();
        clients.forEach(c => clientsMap.set(Number(c.id), c.name));

        const deliveryList: DisplayDelivery[] = raw.map((d) => ({
          order: getShortOrderId(d.orderId),
          client: clientsMap.get(d.clientId) || 'Unknown',
          id: String(d.id),
          address: d.address,
          driver: d.driver,
          company: d.company,
          phone: d.phone,
          status: d.status,
          progress: d.progress,
          color: getStatusColor(d.status),
        }));

        setDeliveries(deliveryList);
        if (deliveryList.length > 0) setSelected(deliveryList[0]);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setDeliveries([]);
        } else {
          console.error('Failed to load delivery data:', err);
          setError(t('deliveryTracking:error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const applyUpdate = (orderShortId: string, changes: Partial<DisplayDelivery>, message: string) => {
    setDeliveries(ds => ds.map(d => d.order === orderShortId ? { ...d, ...changes } : d));
    setSelected(s => s?.order === orderShortId ? { ...s, ...changes } : s);
    setActiveAction(null);
    setToast(message);
  };

  const onTime  = deliveries.filter(d => d.status === 'on_time').length;
  const delayed = deliveries.filter(d => d.status === 'delayed').length;
  const lost    = deliveries.filter(d => d.status === 'lost_in_transit').length;

  const filtered = deliveries.filter(d => {
    const q = query.toLowerCase();
    const matchQ = !q || d.order.toLowerCase().includes(q) || d.client.toLowerCase().includes(q) || d.driver.toLowerCase().includes(q);
    const matchS = !filterStatus || d.status === filterStatus;
    return matchQ && matchS;
  });

  const statusColor = (s: string): 'green' | 'orange' | 'red' =>
    s === 'on_time' || s === 'delivered' ? 'green' : s === 'delayed' ? 'orange' : 'red';

  const selectDelivery = (d: DisplayDelivery) => {
    setSelected(d);
    setActiveAction(null);
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

  const isClosed = selected && (selected.status === 'cancelled' || selected.status === 'delivered');

  return (
    <AppShell role="owner" activePage="delivery-tracking">
      <Topbar title={t('deliveryTracking:title')} />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label={t('deliveryTracking:stats.total')}   value={deliveries.length} sub={t('deliveryTracking:stats.totalSub')} />
        <StatCard label={t('deliveryTracking:stats.onTime')}  value={onTime}            sub={t('deliveryTracking:stats.onTimeSub')} />
        <StatCard label={t('deliveryTracking:stats.delayed')} value={delayed}           sub={t('deliveryTracking:stats.delayedSub')} />
        <StatCard label={t('deliveryTracking:stats.lost')}    value={lost}              sub={t('deliveryTracking:stats.lostSub')} />
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
                  onChange={e => setQuery(e.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>{t('deliveryTracking:table.filter.label')}</label>
                      <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">{t('deliveryTracking:table.filter.all')}</option>
                        <option value="on_time">{t('deliveryTracking:table.filter.onTime')}</option>
                        <option value="delayed">{t('deliveryTracking:table.filter.delayed')}</option>
                        <option value="lost_in_transit">{t('deliveryTracking:table.filter.lost')}</option>
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
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>{t('deliveryTracking:table.empty')}</p>
              ) : filtered.map(d => (
                <article
                  key={d.order}
                  className={`card${selected?.order === d.order ? ' card--selected' : ''}`}
                  onClick={() => selectDelivery(d)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4>{d.order}</h4>
                    <StatusBadge status={d.status} />
                  </div>
                  <p style={{ marginBottom: 2 }}><strong>{t('deliveryTracking:card.client')}:</strong> {d.client}</p>
                  <p style={{ marginBottom: 2 }}><strong>{t('deliveryTracking:card.driver')}:</strong> {d.driver} — {d.company}</p>
                  <p style={{ marginBottom: 6 }}><strong>{t('deliveryTracking:card.address')}:</strong> {d.address}</p>
                  <ProgressBar percent={d.progress} color={statusColor(d.status)} />
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                    {t('deliveryTracking:card.progress', { percent: d.progress })}
                  </p>
                </article>
              ))}
            </div>
          </article>
        </div>

        {selected && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selected.order}</h3>
              <StatusBadge status={selected.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selected.client}</p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.heading')}</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>{t('deliveryTracking:detail.trackingId')}:</strong> {selected.id}</li>
              <li><strong>{t('deliveryTracking:detail.address')}:</strong> {selected.address}</li>
              <li><strong>{t('deliveryTracking:detail.driver')}:</strong> {selected.driver}</li>
              <li><strong>{t('deliveryTracking:detail.company')}:</strong> {selected.company}</li>
              <li><strong>{t('deliveryTracking:detail.phone')}:</strong> {selected.phone}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.progress')}</h4>
            <ProgressBar percent={selected.progress} color={statusColor(selected.status)} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {t('deliveryTracking:detail.progressPct', { percent: selected.progress })}
              {selected.status === 'lost_in_transit' && (
                <span style={{ color: '#d9534f', marginLeft: 8 }}>{t('deliveryTracking:detail.lostWarning')}</span>
              )}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>{t('deliveryTracking:detail.actions')}</h4>

            {isClosed ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {selected.status === 'delivered'
                  ? t('deliveryTracking:detail.deliveredClosed')
                  : t('deliveryTracking:detail.cancelledClosed')}
              </p>
            ) : (
              <>
                <button
                  className="btn primary block"
                  onClick={() => applyUpdate(
                    selected.order,
                    { status: 'delivered', progress: 100, color: 'green' },
                    t('deliveryTracking:toast.delivered', { order: selected.order }),
                  )}
                >
                  {t('deliveryTracking:detail.markDelivered')}
                </button>

                <button
                  className="btn block"
                  style={{ marginTop: 8 }}
                  onClick={() => { setActiveAction(activeAction === 'reschedule' ? null : 'reschedule'); setRescheduleDate(''); }}
                >
                  {activeAction === 'reschedule'
                    ? t('deliveryTracking:detail.cancelReschedule')
                    : t('deliveryTracking:detail.reschedule')}
                </button>
                {activeAction === 'reschedule' && (
                  <div style={{ marginTop: 10, padding: '12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                      {t('deliveryTracking:detail.rescheduleLabel')}
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={rescheduleDate}
                      onChange={e => setRescheduleDate(e.target.value)}
                      style={{ marginBottom: 10, width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn primary"
                        disabled={!rescheduleDate}
                        onClick={() => applyUpdate(
                          selected.order,
                          { status: 'delayed', color: 'orange' },
                          t('deliveryTracking:toast.rescheduled', { order: selected.order, date: rescheduleDate }),
                        )}
                      >
                        {t('deliveryTracking:detail.save')}
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>
                        {t('deliveryTracking:detail.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn block"
                  style={{ marginTop: 8 }}
                  onClick={() => { setActiveAction(activeAction === 'address' ? null : 'address'); setNewAddress(selected.address); }}
                >
                  {activeAction === 'address'
                    ? t('deliveryTracking:detail.cancelAddressChange')
                    : t('deliveryTracking:detail.changeAddress')}
                </button>
                {activeAction === 'address' && (
                  <div style={{ marginTop: 10, padding: '12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                      {t('deliveryTracking:detail.newAddressLabel')}
                    </label>
                    <input
                      className="input"
                      type="text"
                      value={newAddress}
                      onChange={e => setNewAddress(e.target.value)}
                      style={{ marginBottom: 10, width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn primary"
                        disabled={!newAddress.trim()}
                        onClick={() => applyUpdate(
                          selected.order,
                          { address: newAddress.trim() },
                          t('deliveryTracking:toast.addressUpdated', { order: selected.order }),
                        )}
                      >
                        {t('deliveryTracking:detail.save')}
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>
                        {t('deliveryTracking:detail.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn block"
                  style={{ marginTop: 8, color: '#d9534f' }}
                  onClick={() => setActiveAction(activeAction === 'cancel' ? null : 'cancel')}
                >
                  {activeAction === 'cancel'
                    ? t('deliveryTracking:detail.keepDelivery')
                    : t('deliveryTracking:detail.cancelDelivery')}
                </button>
                {activeAction === 'cancel' && (
                  <div style={{ marginTop: 10, padding: '12px', background: '#fff5f5', borderRadius: 8, border: '1px solid #f5c6cb' }}>
                    <p style={{ fontSize: 13, marginBottom: 10 }}>
                      {t('deliveryTracking:detail.cancelConfirm', { order: selected.order, client: selected.client })}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn"
                        style={{ background: '#d9534f', color: '#fff', border: 'none' }}
                        onClick={() => applyUpdate(
                          selected.order,
                          { status: 'cancelled', progress: 0, color: 'red' },
                          t('deliveryTracking:toast.cancelled', { order: selected.order }),
                        )}
                      >
                        {t('deliveryTracking:detail.yesCancel')}
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>
                        {t('deliveryTracking:detail.keep')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </section>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2f3640', color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}

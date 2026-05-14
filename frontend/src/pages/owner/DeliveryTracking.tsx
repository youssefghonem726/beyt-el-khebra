import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { useNavigation } from '../../context/NavigationContext';

// Types for normalized data
interface DeliveryRaw {
  id: string;
  orderId: string;
  clientId: string;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: string;      // 'on_time', 'delayed', 'lost_in_transit', 'scheduled', 'in_transit', 'delivered', 'cancelled'
  progress: number;
  scheduledDate: string; // ISO date
}

interface Order {
  id: string;
}

interface Client {
  id: string;
  name: string;
}

// Combined delivery for UI
interface Delivery {
  order: string;      // short order ID e.g., "#1021"
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

// Helper: extract short order number (e.g., "#1021" from "ORD-1021-2025")
function getShortOrderId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

// Helper: map status to progress bar color
function getStatusColor(status: string): 'green' | 'orange' | 'red' {
  if (status === 'on_time' || status === 'delivered' || status === 'scheduled') return 'green';
  if (status === 'delayed' || status === 'in_transit') return 'orange';
  return 'red';
}

export default function DeliveryTracking() {
  const { navigateTopLevel } = useNavigation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected]     = useState<Delivery | null>(null);

  // Action panel state
  const [activeAction, setActiveAction] = useState<ActionPanel>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [newAddress, setNewAddress]   = useState('');
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/deliveries.json').then(res => {
        if (!res.ok) throw new Error(`Deliveries HTTP ${res.status}`);
        return res.json();
      }),
      fetch('/data/json/orders.json').then(res => {
        if (!res.ok) throw new Error(`Orders HTTP ${res.status}`);
        return res.json();
      }),
      fetch('/data/json/clients.json').then(res => {
        if (!res.ok) throw new Error(`Clients HTTP ${res.status}`);
        return res.json();
      })
    ])
      .then(([deliveriesRaw, ordersRaw, clientsRaw]) => {
        const ordersMap: Record<string, Order> = {};
        ordersRaw.forEach((o: Order) => { ordersMap[o.id] = o; });
        const clientsMap: Record<string, string> = {};
        clientsRaw.forEach((c: Client) => { clientsMap[c.id] = c.name; });

        const deliveryList: Delivery[] = deliveriesRaw.map((d: DeliveryRaw) => ({
          order: getShortOrderId(d.orderId),
          client: clientsMap[d.clientId] || 'Unknown Client',
          id: d.id,
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
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load delivery data:', err);
        setError('Could not load delivery data. Please try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Apply changes to a delivery in state (local mock update)
  const applyUpdate = (orderShortId: string, changes: Partial<Delivery>, message: string) => {
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

  const selectDelivery = (d: Delivery) => {
    setSelected(d);
    setActiveAction(null);
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="delivery-tracking">
        <Topbar title="Delivery Tracking" />
        <div className="loading-state">Loading deliveries...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="delivery-tracking">
        <Topbar title="Delivery Tracking" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  const isClosed = selected && (selected.status === 'cancelled' || selected.status === 'delivered');

  return (
    <AppShell role="owner" activePage="delivery-tracking">
      <Topbar title="Delivery Tracking" />

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Total Deliveries" value={deliveries.length} sub="All active deliveries"  />
        <StatCard label="On Time"          value={onTime}            sub="Running as scheduled"   />
        <StatCard label="Delayed"          value={delayed}           sub="Behind schedule"        />
        <StatCard label="Lost in Transit"  value={lost}              sub="Needs immediate action" />
      </section>

      <section className="production-layout">
        {/* ── Delivery list ── */}
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>All Deliveries</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder="Search by order, client or driver…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>Status</label>
                      <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="on_time">On Time</option>
                        <option value="delayed">Delayed</option>
                        <option value="lost_in_transit">Lost in Transit</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>No matching deliveries.</p>
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
                  <p style={{ marginBottom: 2 }}><strong>Client:</strong> {d.client}</p>
                  <p style={{ marginBottom: 2 }}><strong>Driver:</strong> {d.driver} — {d.company}</p>
                  <p style={{ marginBottom: 6 }}><strong>Address:</strong> {d.address}</p>
                  <ProgressBar percent={d.progress} color={statusColor(d.status)} />
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>{d.progress}% delivered</p>
                </article>
              ))}
            </div>
          </article>
        </div>

        {/* ── Delivery detail panel ── */}
        {selected && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selected.order}</h3>
              <StatusBadge status={selected.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{selected.client}</p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Delivery Details</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>Tracking ID:</strong> {selected.id}</li>
              <li><strong>Address:</strong> {selected.address}</li>
              <li><strong>Driver:</strong> {selected.driver}</li>
              <li><strong>Company:</strong> {selected.company}</li>
              <li><strong>Phone:</strong> {selected.phone}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Progress</h4>
            <ProgressBar percent={selected.progress} color={statusColor(selected.status)} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selected.progress}% complete
              {selected.status === 'lost_in_transit' && (
                <span style={{ color: '#d9534f', marginLeft: 8 }}>More than 2 days delayed</span>
              )}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Actions</h4>

            {isClosed ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {selected.status === 'delivered' ? '✓ Delivery completed.' : '✕ Delivery cancelled.'}
              </p>
            ) : (
              <>
                {/* Mark as Delivered */}
                <button
                  className="btn primary block"
                  onClick={() => applyUpdate(selected.order, { status: 'delivered', progress: 100, color: 'green' }, `✓ ${selected.order} marked as delivered.`)}
                >
                  Mark as Delivered
                </button>

                {/* Reschedule */}
                <button
                  className="btn block"
                  style={{ marginTop: 8 }}
                  onClick={() => { setActiveAction(activeAction === 'reschedule' ? null : 'reschedule'); setRescheduleDate(''); }}
                >
                  {activeAction === 'reschedule' ? 'Cancel Reschedule' : 'Reschedule'}
                </button>
                {activeAction === 'reschedule' && (
                  <div style={{ marginTop: 10, padding: '12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>New delivery date</label>
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
                        onClick={() => applyUpdate(selected.order, { status: 'delayed', color: 'orange' }, `↻ ${selected.order} rescheduled to ${rescheduleDate}.`)}
                      >
                        Save
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Change Address */}
                <button
                  className="btn block"
                  style={{ marginTop: 8 }}
                  onClick={() => { setActiveAction(activeAction === 'address' ? null : 'address'); setNewAddress(selected.address); }}
                >
                  {activeAction === 'address' ? 'Cancel Address Change' : 'Change Address'}
                </button>
                {activeAction === 'address' && (
                  <div style={{ marginTop: 10, padding: '12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>New delivery address</label>
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
                        onClick={() => applyUpdate(selected.order, { address: newAddress.trim() }, `📍 ${selected.order} address updated.`)}
                      >
                        Save
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Cancel Delivery */}
                <button
                  className="btn block"
                  style={{ marginTop: 8, color: '#d9534f' }}
                  onClick={() => setActiveAction(activeAction === 'cancel' ? null : 'cancel')}
                >
                  {activeAction === 'cancel' ? 'Keep Delivery' : 'Cancel Delivery'}
                </button>
                {activeAction === 'cancel' && (
                  <div style={{ marginTop: 10, padding: '12px', background: '#fff5f5', borderRadius: 8, border: '1px solid #f5c6cb' }}>
                    <p style={{ fontSize: 13, marginBottom: 10 }}>
                      Cancel delivery <strong>{selected.order}</strong> for <strong>{selected.client}</strong>? This cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn"
                        style={{ background: '#d9534f', color: '#fff', border: 'none' }}
                        onClick={() => applyUpdate(selected.order, { status: 'cancelled', progress: 0, color: 'red' }, `✕ ${selected.order} delivery cancelled.`)}
                      >
                        Yes, Cancel
                      </button>
                      <button className="btn" onClick={() => setActiveAction(null)}>Keep</button>
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
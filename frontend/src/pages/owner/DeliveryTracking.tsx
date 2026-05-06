import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

interface Delivery {
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

export default function DeliveryTracking({ onNavigate }: Props) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected]     = useState<Delivery | null>(null);

  useEffect(() => {
    fetch('/data/deliveries.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: Delivery[]) => {
        setDeliveries(data);
        setSelected(data[0] ?? null);
        setLoading(false);
      })
      .catch(err => { console.error(err); setError('Could not load delivery data.'); setLoading(false); });
  }, []);

  const onTime   = deliveries.filter(d => d.status === 'ON TIME').length;
  const delayed  = deliveries.filter(d => d.status === 'DELAYED').length;
  const lost     = deliveries.filter(d => d.status === 'LOST IN TRANSIT').length;

  const filtered = deliveries.filter(d => {
    const q = query.toLowerCase();
    const matchQ = !q || d.order.toLowerCase().includes(q) || d.client.toLowerCase().includes(q) || d.driver.toLowerCase().includes(q);
    const matchS = !filterStatus || d.status === filterStatus;
    return matchQ && matchS;
  });

  const statusColor = (s: string) =>
    s === 'ON TIME' ? 'green' : s === 'DELAYED' ? 'orange' : 'red' as const;

  if (loading) {
    return (
      <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
        <Topbar title="Delivery Tracking" userName="Admin User" />
        <div className="loading-state">Loading deliveries...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
        <Topbar title="Delivery Tracking" userName="Admin User" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="delivery-tracking" onNavigate={onNavigate}>
      <Topbar title="Delivery Tracking" userName="Admin User" />

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
                        <option value="ON TIME">On Time</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="LOST IN TRANSIT">Lost in Transit</option>
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
                  onClick={() => setSelected(d)}
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
              {selected.status === 'LOST IN TRANSIT' && (
                <span style={{ color: '#d9534f', marginLeft: 8 }}>More than 2 days delayed</span>
              )}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Actions</h4>
            <button className="btn primary block" onClick={() => onNavigate('delivery-list')}>
              Manage Delivery
            </button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('delivery-list')}>
              Reschedule
            </button>
            <button className="btn block" style={{ marginTop: 8, color: '#d9534f' }} onClick={() => onNavigate('delivery-list')}>
              Cancel Delivery
            </button>
          </aside>
        )}
      </section>
    </AppShell>
  );
}

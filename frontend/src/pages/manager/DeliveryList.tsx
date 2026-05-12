import { useState, useEffect, Fragment } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface Delivery {
  id: string;
  orderId: string;
  client: string;
  address: string;
  scheduledDate: string;
  status: string;
}

type ExpandKey = { id: string; action: 'reschedule' | 'address' } | null;

export default function DeliveryList() {
  const { navigateTopLevel } = useNavigation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expand, setExpand]       = useState<ExpandKey>(null);
  const [date, setDate]           = useState('');
  const [address, setAddress]     = useState('');
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/data/manager-deliveries.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Delivery[]) => {
        setDeliveries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load deliveries:', err);
        setError('Could not load delivery data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const toggle = (id: string, action: 'reschedule' | 'address') => {
    if (expand?.id === id && expand.action === action) {
      setExpand(null);
    } else {
      setExpand({ id, action });
      setDate('');
      setAddress('');
    }
  };

  const saveAndClose = () => setExpand(null);

  if (loading) {
    return (
      <AppShell role="manager" activePage="delivery-list">
        <Topbar title="Deliveries" />
        <div className="loading-state">Loading deliveries...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="manager" activePage="delivery-list">
        <Topbar title="Deliveries" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="delivery-list">
      <Topbar title="Deliveries" />

      <section className="table-wrap">
        <div className="table-head"><h3>All Deliveries</h3></div>

        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Delivery</th>
                <th>Order</th>
                <th>Client</th>
                <th>Address</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const isDone      = delivered.has(d.id);
                const isCancelled = cancelled.has(d.id);
                const status      = isDone ? 'delivered' : isCancelled ? 'cancelled' : d.status;
                const isExpanded  = expand?.id === d.id;

                return (
                  <Fragment key={d.id}>
                    <tr>
                      <td><strong>{d.id}</strong></td>
                      <td>{d.orderId}</td>
                      <td>{d.client}</td>
                      <td style={{ maxWidth: 180, fontSize: 12 }}>{d.address}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{d.scheduledDate}</td>
                      <td><StatusBadge status={status} /></td>
                      <td>
                        {isDone || isCancelled ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {isDone ? 'Delivered' : 'Cancelled'}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn primary"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setDelivered(s => { const n = new Set(s); n.add(d.id); return n; })}
                            >
                              Mark Delivered
                            </button>
                            <button
                              className={`btn${isExpanded && expand?.action === 'reschedule' ? ' primary' : ''}`}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => toggle(d.id, 'reschedule')}
                            >
                              Reschedule
                            </button>
                            <button
                              className={`btn${isExpanded && expand?.action === 'address' ? ' primary' : ''}`}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => toggle(d.id, 'address')}
                            >
                              Change Address
                            </button>
                            <button
                              className="btn"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#d9534f' }}
                              onClick={() => setCancelled(s => { const n = new Set(s); n.add(d.id); return n; })}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--surface-2, #f8f9fb)', padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                          {expand?.action === 'reschedule' && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div className="field" style={{ margin: 0 }}>
                                <label>New Delivery Date</label>
                                <input
                                  className="input"
                                  type="date"
                                  value={date}
                                  onChange={(e) => setDate(e.target.value)}
                                />
                              </div>
                              <button className="btn primary" disabled={!date} onClick={saveAndClose}>
                                Save
                              </button>
                              <button className="btn" onClick={() => setExpand(null)}>Cancel</button>
                            </div>
                          )}
                          {expand?.action === 'address' && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div className="field" style={{ margin: 0, flex: 1 }}>
                                <label>New Address</label>
                                <input
                                  className="input"
                                  placeholder="Enter updated delivery address"
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                />
                              </div>
                              <button className="btn primary" disabled={!address.trim()} onClick={saveAndClose}>
                                Save
                              </button>
                              <button className="btn" onClick={() => setExpand(null)}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
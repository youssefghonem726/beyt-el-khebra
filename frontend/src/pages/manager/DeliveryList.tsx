import { useState, Fragment } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

interface Delivery {
  id: string;
  orderId: string;
  client: string;
  address: string;
  scheduledDate: string;
  status: string;
}

const DELIVERIES: Delivery[] = [
  { id: 'DEL-001', orderId: '#1021', client: 'Design Hub',    address: '14 Tahrir St, Cairo',             scheduledDate: '28 Apr 2026', status: 'SCHEDULED'  },
  { id: 'DEL-002', orderId: '#1022', client: 'Client Name',   address: '5 Nile Corniche, Giza',           scheduledDate: '29 Apr 2026', status: 'IN TRANSIT' },
  { id: 'DEL-003', orderId: '#1019', client: 'Retail Plus',   address: '22 City Stars Mall, Nasr City',   scheduledDate: '26 Apr 2026', status: 'DELIVERED'  },
  { id: 'DEL-004', orderId: '#1020', client: 'Marketing Co.', address: '9 Hassan Allam St, Heliopolis',   scheduledDate: '30 Apr 2026', status: 'ON HOLD'    },
  { id: 'DEL-005', orderId: '#1026', client: 'Marketing Co.', address: '9 Hassan Allam St, Heliopolis',   scheduledDate: '1 May 2026',  status: 'SCHEDULED'  },
];

type ExpandKey = { id: string; action: 'reschedule' | 'address' } | null;

export default function DeliveryList({ onNavigate: _onNavigate }: Props) {
  const [expand, setExpand]       = useState<ExpandKey>(null);
  const [date, setDate]           = useState('');
  const [address, setAddress]     = useState('');
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

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

  return (
    <AppShell role="manager" activePage="delivery-list" onNavigate={_onNavigate}>
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
              {DELIVERIES.map((d) => {
                const isDone      = delivered.has(d.id);
                const isCancelled = cancelled.has(d.id);
                const status      = isDone ? 'DELIVERED' : isCancelled ? 'CANCELLED' : d.status;
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

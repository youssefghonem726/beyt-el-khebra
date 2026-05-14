import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';

type ActionState = 'delivered' | 'rescheduled' | 'cancelled' | 'address-changed' | null;

interface Delivery {
  id: string;
  orderId: string;
  clientId: string;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: string;
  progress: number;
  scheduledDate: string;
}

interface Order {
  id: string;
}

interface Client {
  id: string;
  name: string;
}

// Helper to extract short order ID (e.g., "#1021" from "ORD-1021-2025")
function getShortOrderId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

export default function DeliveryViewMore() {
  const { id: deliveryId = '' } = useParams<{ id: string }>();
  const { goBack, canGoBack, navigateTopLevel } = useNavigation();
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [action, setAction] = useState<ActionState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDisplayId, setOrderDisplayId] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!deliveryId) {
      setError('No delivery ID provided.');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/data/deliveries.json').then(res => res.json()),
      fetch('/data/orders.json').then(res => res.json()),
      fetch('/data/clients.json').then(res => res.json())
    ])
      .then(([deliveriesRaw, ordersRaw, clientsRaw]) => {
        const delivery = deliveriesRaw.find((d: Delivery) => d.id === deliveryId);
        if (!delivery) {
          setError(`Delivery ${deliveryId} not found.`);
          setLoading(false);
          return;
        }

        const order = ordersRaw.find((o: Order) => o.id === delivery.orderId);
        const client = clientsRaw.find((c: Client) => c.id === delivery.clientId);

        setOrderDisplayId(order ? getShortOrderId(order.id) : delivery.orderId);
        setClientName(client ? client.name : 'Unknown Client');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load delivery data:', err);
        setError('Could not load delivery details. Please try again later.');
        setLoading(false);
      });
  }, [deliveryId]);

  const confirm = (type: ActionState) => setAction(type);

  if (loading) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>← Back</button>
          )}
          <section className="box center-card">
            <div className="loading-state">Loading delivery details...</div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>← Back</button>
          )}
          <section className="box center-card">
            <div className="error-state">{error}</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="track-shell">
        {canGoBack && (
          <button className="global-back-btn" onClick={goBack}>← Back</button>
        )}
        <section className="box center-card">
          <h2>Delivery Actions - {orderDisplayId}</h2>
          <p className="muted">Client: {clientName}</p>
          <p className="muted">Use these actions to update delivery status and shipping details.</p>
          <div className="line" />

          {action === 'delivered' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#166534' }}>✓ Marked as Delivered</strong>
              <p style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>Order {orderDisplayId} has been marked as delivered successfully.</p>
            </div>
          )}
          {action === 'rescheduled' && date && (
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#1d4ed8' }}>✓ Delivery Rescheduled</strong>
              <p style={{ color: '#1e40af', fontSize: 13, marginTop: 4 }}>New delivery date: {date}</p>
            </div>
          )}
          {action === 'cancelled' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#991b1b' }}>✓ Delivery Cancelled</strong>
              <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>The delivery for Order {orderDisplayId} has been cancelled.</p>
            </div>
          )}
          {action === 'address-changed' && address && (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#854d0e' }}>✓ Address Updated</strong>
              <p style={{ color: '#92400e', fontSize: 13, marginTop: 4 }}>New address: {address}</p>
            </div>
          )}

          {!action && (
            <div className="stack">
              <button className="btn primary block" onClick={() => confirm('delivered')}>Mark as Delivered</button>
              <button className="btn block" onClick={() => confirm('rescheduled')}>Reschedule Delivery Date</button>
              <button className="btn block" onClick={() => confirm('cancelled')}>Cancel Delivery</button>
              <button className="btn block" onClick={() => confirm('address-changed')}>Change Address</button>
            </div>
          )}

          {(action === 'rescheduled' || action === 'address-changed') && (
            <>
              <div className="line" />
              {action === 'rescheduled' && (
                <div className="field">
                  <label>New Delivery Date</label>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
              {action === 'address-changed' && (
                <div className="field">
                  <label>New Address</label>
                  <textarea className="textarea" placeholder="Enter updated address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              )}
            </>
          )}

          <div className="actions-inline" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => { setAction(null); setDate(''); setAddress(''); }}>Reset</button>
            <button className="btn primary" onClick={() => navigateTopLevel('delivery-list')}>Done</button>
          </div>
        </section>
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports
import { getDeliveryById } from '../../lib/api/deliveriesService';
import type { DeliveryResponse } from '../../lib/api/deliveriesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

type ActionState = 'delivered' | 'rescheduled' | 'cancelled' | 'address-changed' | null;

function getShortOrderId(orderId: number): string {
  return `#${orderId}`;
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

    const fetchData = async () => {
      try {
        // Fetch the specific delivery and clients list in parallel
        const [deliveryRes, clientsRes] = await Promise.all([
          getDeliveryById(deliveryId),
          getClients(),
        ]);

        const delivery: DeliveryResponse = deliveryRes.data.data;
        const clients = clientsRes.data.data.results;

        console.log('DeliveryViewMore - delivery:', delivery);
        console.log('DeliveryViewMore - clients:', clients);

        // Find client name
        const client = clients.find((c: any) => Number(c.id) === delivery.clientId);
        setClientName(client ? client.name : 'Unknown');
        setOrderDisplayId(getShortOrderId(delivery.orderId));
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError(`Delivery ${deliveryId} not found.`);
        } else {
          console.error('Failed to load delivery:', err);
          setError('Could not load delivery details. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
import { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';

interface Props { onNavigate: (page: string) => void; }

export default function DeliveryViewMore({ onNavigate }: Props) {
  const { goBack, canGoBack } = useNavigation();
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');

  return (
    <div className="page">
      <main className="track-shell">
        {canGoBack && (
          <button className="global-back-btn" onClick={goBack}>← Back</button>
        )}
        <section className="box center-card">
          <h2>Delivery Actions - Order #1021</h2>
          <p className="muted">Use these actions to update delivery status and shipping details.</p>
          <div className="line" />

          <div className="stack">
            <button className="btn primary block">Mark as Delivered</button>
            <button className="btn block">Reschedule Delivery Date</button>
            <button className="btn block">Cancel Delivery</button>
            <button className="btn block">Change Address</button>
          </div>

          <div className="line" />
          <div className="field">
            <label>New Delivery Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>New Address</label>
            <textarea className="textarea" placeholder="Enter updated address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="actions-inline" style={{ marginTop: 12 }}>
            <button className="btn" onClick={goBack}>Cancel</button>
            <button className="btn primary" onClick={() => onNavigate('delivery-tracking')}>Save Update</button>
          </div>
        </section>
      </main>
    </div>
  );
}

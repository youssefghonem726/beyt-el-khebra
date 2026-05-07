import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

export default function Support() {
  const { navigateTopLevel } = useNavigation();
  const [form, setForm] = useState({ subject: '', orderId: '', message: '' });
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSend = () => {
    if (!form.subject || !form.message) return;
    setSent(true);
  };

  return (
    <AppShell role="client" activePage="support">
      <Topbar title="Support" />
      <section className="split">
        <article className="box">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>✓</p>
              <h3 style={{ marginBottom: 8 }}>Message Sent!</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Our support team will get back to you within 24 hours.</p>
              <button className="btn primary" onClick={() => { setSent(false); setForm({ subject: '', orderId: '', message: '' }); }}>Send Another</button>
            </div>
          ) : (
            <>
              <h3>Contact Support</h3>
              <div className="field"><label>Subject</label><input className="input" type="text" placeholder="What do you need help with?" value={form.subject} onChange={set('subject')} /></div>
              <div className="field"><label>Order ID (optional)</label><input className="input" type="text" placeholder="e.g. #1021" value={form.orderId} onChange={set('orderId')} /></div>
              <div className="field"><label>Message</label><textarea className="textarea" placeholder="Describe your issue..." value={form.message} onChange={set('message')} /></div>
              <button className="btn primary" style={{ marginTop: 8 }} onClick={handleSend} disabled={!form.subject || !form.message}>Send Message</button>
            </>
          )}
        </article>
        <aside className="box">
          <h3>Direct Channels</h3>
          <ul>
            <li>Email: support@baytelkhebra.com</li>
            <li>Phone: +20 100 000 0000</li>
            <li>Working Hours: 9:00 AM - 6:00 PM</li>
          </ul>
          <div className="line" />
          <button className="btn block" onClick={() => navigateTopLevel('track-order')}>Track an Order</button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => navigateTopLevel('place-new-order')}>Create New Order</button>
        </aside>
      </section>
    </AppShell>
  );
}
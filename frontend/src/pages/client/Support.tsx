import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

export default function Support({ onNavigate }: Props) {
  const [form, setForm] = useState({ subject: '', orderId: '', message: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell role="client" activePage="support" onNavigate={onNavigate}>
      <Topbar title="Support" userName="Ahmed Store" />
      <section className="split">
        <article className="box">
          <h3>Contact Support</h3>
          <div className="field"><label>Subject</label><input className="input" type="text" placeholder="What do you need help with?" value={form.subject} onChange={set('subject')} /></div>
          <div className="field"><label>Order ID (optional)</label><input className="input" type="text" placeholder="e.g. #1021" value={form.orderId} onChange={set('orderId')} /></div>
          <div className="field"><label>Message</label><textarea className="textarea" placeholder="Describe your issue..." value={form.message} onChange={set('message')} /></div>
          <button className="btn primary" style={{ marginTop: 8 }}>Send Message</button>
        </article>
        <aside className="box">
          <h3>Direct Channels</h3>
          <ul>
            <li>Email: support@baytelkhebra.com</li>
            <li>Phone: +20 100 000 0000</li>
            <li>Working Hours: 9:00 AM - 6:00 PM</li>
          </ul>
          <div className="line" />
          <button className="btn block" onClick={() => onNavigate('track-order')}>Track an Order</button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('place-new-order')}>Create New Order</button>
        </aside>
      </section>
    </AppShell>
  );
}

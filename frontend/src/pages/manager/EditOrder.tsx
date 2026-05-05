import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

export default function EditOrder({ onNavigate }: Props) {
  const [form, setForm] = useState({ client: 'Client Name', batch: 'B-260426-P', status: 'UNPRICED', product: 'Packaging Sleeves', qty: '2500', deadline: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell role="manager" activePage="active-jobs" onNavigate={onNavigate}>
      <Topbar title="Edit Order #1033" userName="Manager" />
      <section className="box">
        <div className="form-grid">
          <div className="field"><label>Client Name</label><input className="input" type="text" value={form.client} onChange={set('client')} /></div>
          <div className="field"><label>Batch Code</label><input className="input" type="text" value={form.batch} onChange={set('batch')} /></div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={set('status')}>
              <option>UNPRICED</option><option>PENDING</option><option>IN_PROGRESS</option><option>COMPLETED</option>
            </select>
          </div>
          <div className="field"><label>Product</label><input className="input" type="text" value={form.product} onChange={set('product')} /></div>
          <div className="field"><label>Quantity</label><input className="input" type="number" value={form.qty} onChange={set('qty')} /></div>
          <div className="field"><label>Deadline</label><input className="input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
        </div>
        <div className="line" />
        <div className="actions-inline">
          <button className="btn primary" onClick={() => onNavigate('manager-order-details')}>Save Changes</button>
          <button className="btn" onClick={() => onNavigate('manager-order-details')}>Cancel</button>
        </div>
      </section>
    </AppShell>
  );
}

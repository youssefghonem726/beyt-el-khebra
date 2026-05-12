import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { useParams } from 'react-router-dom';

export default function EditOrder() {
  const { id: orderId } = useParams<{ id: string }>();
  const { goBack } = useNavigation();
  const [form, setForm] = useState({ client: 'Client Name', batch: 'B-260426-P', status: 'unpriced', product: 'Packaging Sleeves', qty: '2500', deadline: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell role="manager" activePage="manager-orders">
      <Topbar title={`Edit Order #${orderId ?? ''}`} />
      <section className="box">
        <div className="form-grid">
          <div className="field"><label>Client Name</label><input className="input" type="text" value={form.client} onChange={set('client')} /></div>
          <div className="field"><label>Batch Code</label><input className="input" type="text" value={form.batch} onChange={set('batch')} /></div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="unpriced">unpriced</option><option value="pending">pending</option><option value="in_progress">in_progress</option><option value="completed">completed</option>
            </select>
          </div>
          <div className="field"><label>Product</label><input className="input" type="text" value={form.product} onChange={set('product')} /></div>
          <div className="field"><label>Quantity</label><input className="input" type="number" value={form.qty} onChange={set('qty')} /></div>
          <div className="field"><label>Deadline</label><input className="input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
        </div>
        <div className="line" />
        <div className="actions-inline">
          <button className="btn primary" onClick={() => goBack()}>Save Changes</button>
          <button className="btn" onClick={() => goBack()}>Cancel</button>
        </div>
      </section>
    </AppShell>
  );
}
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

export default function PlaceNewOrder({ onNavigate }: Props) {
  const [form, setForm] = useState({ product: '', quantity: '', size: '', paper: '', color: '', finish: '', deadline: '', notes: '', extra: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell role="client" activePage="place-new-order" onNavigate={onNavigate}>
      <Topbar title="Place New Order" userName="Client Name" />
      <section className="split">
        <article className="table-wrap">
          <h2 className="section-title">1. Choose Order Type</h2>
          <div className="form-grid-2">
            <div className="box"><h3>Priced Orders</h3><p>Choose from predefined products with instant pricing.</p></div>
            <div className="box"><h3>Custom Order</h3><p>Request a custom order and we will send you a quote.</p></div>
          </div>

          <h2 className="section-title">2. Order Details</h2>
          <div className="form-grid">
            <div className="field">
              <label>Product / Service</label>
              <select className="select" value={form.product} onChange={set('product')}>
                <option value="">Select product or service</option>
                <option>Business Cards</option><option>Flyers</option><option>Stickers</option>
              </select>
            </div>
            <div className="field"><label>Quantity</label><input className="input" type="number" placeholder="Enter quantity" value={form.quantity} onChange={set('quantity')} /></div>
            <div className="field"><label>Size</label><input className="input" type="text" placeholder="e.g. A4, 10x15 cm" value={form.size} onChange={set('size')} /></div>
            <div className="field">
              <label>Paper Type</label>
              <select className="select" value={form.paper} onChange={set('paper')}><option value="">Select paper type</option></select>
            </div>
            <div className="field">
              <label>Color</label>
              <select className="select" value={form.color} onChange={set('color')}><option value="">Select color</option></select>
            </div>
            <div className="field">
              <label>Finish</label>
              <select className="select" value={form.finish} onChange={set('finish')}><option value="">Select finish</option></select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="field"><label>Deadline / Delivery Date</label><input className="input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
            <div className="field"><label>Special Instructions (Optional)</label><textarea className="textarea" placeholder="Add any special notes..." value={form.notes} onChange={set('notes')} /></div>
          </div>

          <h2 className="section-title">3. Upload Files</h2>
          <div className="upload-zone">
            <p>Drag and drop your files here</p>
            <p className="tiny">Accepted formats: PDF, AI, PSD, JPG, PNG</p>
          </div>

          <h2 className="section-title">4. Additional Notes (Optional)</h2>
          <textarea className="textarea" placeholder="Add any additional information..." value={form.extra} onChange={set('extra')} />
        </article>

        <aside className="stack">
          <section className="box">
            <h3>Order Summary</h3>
            <p className="muted">No items selected yet</p>
            <div className="line" />
            <ul>
              <li>Order Type: Custom Order</li>
              <li>Items: -</li>
              <li>Quantity: {form.quantity || '-'}</li>
              <li>Subtotal: -</li>
            </ul>
          </section>
          <section className="box">
            <h3>What happens next?</h3>
            <ul>
              <li>1. We review your order</li><li>2. We send you a quote</li><li>3. You confirm the quote</li>
              <li>4. We start production</li><li>5. We deliver your order</li>
            </ul>
          </section>
          <div className="actions-inline">
            <button className="btn primary block" onClick={() => onNavigate('my-orders')}>Submit Order Request</button>
            <button className="btn block" onClick={() => onNavigate('quotes')}>Request Price Quotation</button>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

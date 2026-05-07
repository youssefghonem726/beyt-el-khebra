import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

type OrderType = 'package' | 'single' | null;
type ItemType = 'book' | 'booklet' | 'card' | 'sticker' | 'poster';

interface PackageItem {
  id: string;
  type: ItemType;
  data: Record<string, any>;
}

function FileField({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        style={{ fontSize: 13 }}
      />
      {value && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Selected: {value.name}</p>}
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input className="input" type="number" min={1} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 120 }} />
    </div>
  );
}

function ItemEditor({ item, onChange, onRemove, hideHeader = false }: { item: PackageItem; onChange: (d: Record<string, any>) => void; onRemove: () => void; hideHeader?: boolean }) {
  const d = item.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });

  const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);

  return (
    <article className={hideHeader ? undefined : 'box'} style={hideHeader ? undefined : { marginBottom: 12 }}>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4>{typeLabel}</h4>
          <button className="btn" style={{ fontSize: 12 }} onClick={onRemove}>Remove</button>
        </div>
      )}

      <NumberField label="Quantity" value={d.qty ?? '100'} onChange={(v) => set('qty', v)} />
      <FileField label="Print File (PDF)" value={d.pdf ?? null} onChange={(f) => set('pdf', f)} />

      {item.type === 'book' && (
        <>
          <FileField label="Cover File" value={d.cover ?? null} onChange={(f) => set('cover', f)} />
          <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={d.coverFinish ?? 'Matte'} onChange={(v) => set('coverFinish', v)} />
          <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={(v) => set('colors', v)} />
          <SelectField label="Size" options={['A4', 'A5']} value={d.size ?? 'A4'} onChange={(v) => set('size', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={(v) => set('printType', v)} />
          <SelectField label="Binding" options={['Softcover', 'Hardcover', 'Spiral']} value={d.casing ?? 'Softcover'} onChange={(v) => set('casing', v)} />
        </>
      )}

      {item.type === 'booklet' && (
        <>
          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '150g'} onChange={(v) => set('weight', v)} />
          <SelectField label="Size" options={['A4', 'A3 (Centerfold)']} value={d.size ?? 'A4'} onChange={(v) => set('size', v)} />
          <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={(v) => set('colors', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={(v) => set('printType', v)} />
          <SelectField label="Binding" options={['Staple', 'Glue']} value={d.casing ?? 'Staple'} onChange={(v) => set('casing', v)} />
        </>
      )}

      {item.type === 'card' && (
        <>
          <SelectField label="Paper Weight" options={['200g', '300g', '400g']} value={d.weight ?? '300g'} onChange={(v) => set('weight', v)} />
          <SelectField label="Size" options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={d.size ?? '6×9 cm'} onChange={(v) => set('size', v)} />
          <SelectField label="Finish" options={['Matte', 'Glossy', 'UV']} value={d.finish ?? 'Matte'} onChange={(v) => set('finish', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={(v) => set('printType', v)} />
        </>
      )}

      {item.type === 'sticker' && (
        <>
          <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={d.material ?? 'Vinyl'} onChange={(v) => set('material', v)} />
          <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={d.shape ?? 'Rectangle'} onChange={(v) => set('shape', v)} />
          <SelectField label="Finish" options={['Glossy', 'Matte']} value={d.finish ?? 'Glossy'} onChange={(v) => set('finish', v)} />
        </>
      )}

      {item.type === 'poster' && (
        <>
          <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={d.size ?? 'A3'} onChange={(v) => set('size', v)} />
          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '200g'} onChange={(v) => set('weight', v)} />
          <SelectField label="Finish" options={['Matte', 'Glossy']} value={d.finish ?? 'Matte'} onChange={(v) => set('finish', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front'} onChange={(v) => set('printType', v)} />
        </>
      )}
    </article>
  );
}

export default function PlaceNewOrder() {
  const { navigateTopLevel } = useNavigation();
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [singleType, setSingleType] = useState<ItemType | ''>('');
  const [singleData, setSingleData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState('');

  const addItem = (type: ItemType) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), type, data: {} }]);
  };

  const updateItem = (id: string, data: Record<string, any>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, data } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (submitted) {
    return (
      <AppShell role="client" activePage="place-new-order">
        <Topbar title="Place New Order" />
        <section className="box" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>✓</p>
          <h2 style={{ marginBottom: 8 }}>Order Submitted!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            We've received your order and will send you a quote shortly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => navigateTopLevel('my-orders')}>View My Orders</button>
            <button className="btn" onClick={() => { setSubmitted(false); setOrderType(null); setItems([]); setSingleType(''); setSingleData({}); setNotes(''); }}>
              Place Another
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="place-new-order">
      <Topbar title="Place New Order" />

      {!orderType && (
        <section style={{ maxWidth: 700, margin: '0 auto' }}>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Choose how you'd like to place your order.
          </p>
          <div className="grid-2" style={{ gap: 16 }}>
            <div
              className="box"
              style={{ cursor: 'pointer', borderColor: 'var(--border)', transition: 'border-color .15s' }}
              onClick={() => setOrderType('package')}
            >
              <h3 style={{ marginBottom: 8 }}>Package Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Combine multiple print items (books, cards, posters…) into one order.
              </p>
            </div>
            <div
              className="box"
              style={{ cursor: 'pointer', borderColor: 'var(--border)', transition: 'border-color .15s' }}
              onClick={() => setOrderType('single')}
            >
              <h3 style={{ marginBottom: 8 }}>Individual Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Order a single print item with full customization options.
              </p>
            </div>
          </div>
        </section>
      )}

      {orderType === 'package' && (
        <section className="split">
          <article>
            <button className="global-back-btn" style={{ marginBottom: 12 }} onClick={() => setOrderType(null)}>
              ← Back
            </button>
            <h3 style={{ marginBottom: 12 }}>Add Items to Package</h3>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <select className="select" onChange={(e) => { if (e.target.value) { addItem(e.target.value as ItemType); e.target.value = ''; } }}>
                <option value="">+ Add item type</option>
                <option value="book">Book</option>
                <option value="booklet">Booklet</option>
                <option value="card">Business Card</option>
                <option value="sticker">Sticker</option>
                <option value="poster">Poster</option>
              </select>
            </div>

            {items.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>No items added yet. Use the selector above to add items.</p>
            )}
            {items.map((item) => (
              <ItemEditor
                key={item.id}
                item={item}
                onChange={(data) => updateItem(item.id, data)}
                onRemove={() => removeItem(item.id)}
              />
            ))}

            <div className="field" style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Additional Notes</label>
              <textarea className="input" rows={3} placeholder="Any special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
            </div>
          </article>

          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <h3 style={{ marginBottom: 12 }}>Package Summary</h3>
            {items.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No items added.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, marginBottom: 16 }}>
                {items.map((i) => (
                  <li key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{i.type.charAt(0).toUpperCase() + i.type.slice(1)}</span>
                    <span className="muted">{i.data.qty ?? 100} pcs</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Pricing will be sent to you after submission.
            </p>
            <button
              className="btn primary block"
              disabled={items.length === 0}
              onClick={() => setSubmitted(true)}
            >
              Submit Package
            </button>
          </aside>
        </section>
      )}

      {orderType === 'single' && (
        <section style={{ maxWidth: 600 }}>
          <button className="global-back-btn" style={{ marginBottom: 12 }} onClick={() => { setOrderType(null); setSingleType(''); setSingleData({}); }}>
            ← Back
          </button>

          <div className="box">
            <h3 style={{ marginBottom: 14 }}>Individual Order</h3>

            <div className="field" style={{ marginBottom: singleType ? 0 : 4 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Item Type</label>
              <select
                className="select"
                value={singleType}
                onChange={(e) => { setSingleType(e.target.value as ItemType); setSingleData({}); }}
              >
                <option value="">Select type…</option>
                <option value="book">Book</option>
                <option value="booklet">Booklet</option>
                <option value="card">Business Card</option>
                <option value="sticker">Sticker</option>
                <option value="poster">Poster</option>
              </select>
            </div>

            {singleType && (
              <>
                <div className="line" style={{ margin: '14px 0' }} />
                <ItemEditor
                  item={{ id: 'single', type: singleType, data: singleData }}
                  onChange={setSingleData}
                  onRemove={() => { setSingleType(''); setSingleData({}); }}
                  hideHeader
                />
                <div className="line" style={{ margin: '14px 0' }} />
                <div className="field" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Additional Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Any special instructions…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  Pricing will be sent to you after submission.
                </p>
                <button className="btn primary" onClick={() => setSubmitted(true)}>
                  Submit Order
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
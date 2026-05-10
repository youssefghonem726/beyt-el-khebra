import { useState, useEffect } from 'react';
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

interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
}

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];

function docTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'PDF': return '#e74c3c';
    case 'AI':  return '#f47d01';
    case 'PSD': return '#3498db';
    case 'PNG':
    case 'JPG': return '#27ae60';
    default:    return '#7f8c8d';
  }
}

function fmtSize(kb: number): string {
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
}

// ── File field that can show a library document instead of a file picker ──
function FileField({ label, value, onChange, libraryDoc, onClearLibrary }: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  libraryDoc?: ClientDocument | null;
  onClearLibrary?: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (libraryDoc && !value && !showPicker) {
    return (
      <div className="field" style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 8,
          border: '2px solid var(--primary)', background: 'var(--primary-soft)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
            background: docTypeColor(libraryDoc.type),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>
            {libraryDoc.type}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {libraryDoc.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{libraryDoc.fileName}</div>
          </div>
          <button
            className="btn"
            style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
            onClick={() => { setShowPicker(true); onClearLibrary?.(); }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

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

const SPEC_LABEL: Record<string, string> = {
  book: 'Book Specifications', booklet: 'Booklet Specifications',
  card: 'Card Specifications', sticker: 'Sticker Specifications', poster: 'Poster Specifications',
};

function ItemEditor({ item, onChange, onRemove, libraryDoc, onClearLibraryDoc }: {
  item: PackageItem;
  onChange: (d: Record<string, any>) => void;
  onRemove: () => void;
  libraryDoc?: ClientDocument | null;
  onClearLibraryDoc?: () => void;
}) {
  const d = item.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const typeInfo = ITEM_TYPES.find(t => t.id === item.type)!;

  return (
    <div className="box">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'var(--primary-soft)', border: '1.5px solid var(--primary-light)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>{typeInfo.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{typeInfo.label}</span>
        </div>
        <button className="btn" style={{ fontSize: 12 }} onClick={onRemove}>Remove</button>
      </div>

      {/* File & Quantity */}
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>File & Quantity</p>
      <FileField label="Print File (PDF)" value={d.pdf ?? null} onChange={f => set('pdf', f)} libraryDoc={libraryDoc} onClearLibrary={onClearLibraryDoc} />
      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Quantity</label>
        <input className="input" type="number" min={1} placeholder="e.g. 100" value={d.qty ?? ''} onChange={e => set('qty', e.target.value)} />
      </div>

      {/* Per-type specs */}
      {item.type === 'book' && (
        <>
          <div className="line" style={{ margin: '0 0 16px' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.book}</p>
          <FileField label="Cover File" value={d.cover ?? null} onChange={f => set('cover', f)} />
          <div className="form-grid-2" style={{ marginTop: 4 }}>
            <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={d.coverFinish ?? 'Matte'} onChange={v => set('coverFinish', v)} />
            <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
            <SelectField label="Size" options={['A4', 'A5']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
            <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label="Binding" options={['Softcover', 'Hardcover', 'Spiral']} value={d.casing ?? 'Softcover'} onChange={v => set('casing', v)} />
          </div>
        </>
      )}
      {item.type === 'booklet' && (
        <>
          <div className="line" style={{ margin: '0 0 16px' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.booklet}</p>
          <div className="form-grid-2">
            <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '150g'} onChange={v => set('weight', v)} />
            <SelectField label="Size" options={['A4', 'A3 (Centerfold)']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
            <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
            <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label="Binding" options={['Staple', 'Glue']} value={d.casing ?? 'Staple'} onChange={v => set('casing', v)} />
          </div>
        </>
      )}
      {item.type === 'card' && (
        <>
          <div className="line" style={{ margin: '0 0 16px' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.card}</p>
          <div className="form-grid-2">
            <SelectField label="Paper Weight" options={['200g', '300g', '400g']} value={d.weight ?? '300g'} onChange={v => set('weight', v)} />
            <SelectField label="Size" options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={d.size ?? '6×9 cm'} onChange={v => set('size', v)} />
            <SelectField label="Finish" options={['Matte', 'Glossy', 'UV']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
            <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}
      {item.type === 'sticker' && (
        <>
          <div className="line" style={{ margin: '0 0 16px' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.sticker}</p>
          <div className="form-grid-2">
            <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={d.material ?? 'Vinyl'} onChange={v => set('material', v)} />
            <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={d.shape ?? 'Rectangle'} onChange={v => set('shape', v)} />
            <SelectField label="Finish" options={['Glossy', 'Matte']} value={d.finish ?? 'Glossy'} onChange={v => set('finish', v)} />
          </div>
        </>
      )}
      {item.type === 'poster' && (
        <>
          <div className="line" style={{ margin: '0 0 16px' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.poster}</p>
          <div className="form-grid-2">
            <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={d.size ?? 'A3'} onChange={v => set('size', v)} />
            <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '200g'} onChange={v => set('weight', v)} />
            <SelectField label="Finish" options={['Matte', 'Glossy']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
            <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}
    </div>
  );
}

export default function PlaceNewOrder() {
  const { navigateTopLevel } = useNavigation();

  const [orderType, setOrderType]     = useState<OrderType>(null);
  const [items, setItems]             = useState<PackageItem[]>([]);
  const [singleType, setSingleType]   = useState<ItemType | ''>('');
  const [singleData, setSingleData]   = useState<Record<string, any>>({});
  const [submitted, setSubmitted]     = useState(false);
  const [notes, setNotes]             = useState('');

  // Document library
  const [docs, setDocs]               = useState<ClientDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');

  useEffect(() => {
    fetch('/data/documents.json')
      .then(r => r.json())
      .then(setDocs)
      .catch(() => {});
  }, []);

  const selectedDoc = docs.find(d => d.id === selectedDocId) ?? null;

  const addItem = (type: ItemType) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), type, data: {} }]);
  };
  const updateItem = (id: string, data: Record<string, any>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, data } : i)));
  };
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  function resetAll() {
    setSubmitted(false);
    setOrderType(null);
    setItems([]);
    setSingleType('');
    setSingleData({});
    setNotes('');
    setSelectedDocId('');
  }

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
            <button className="btn" onClick={resetAll}>Place Another</button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="place-new-order">
      <Topbar title="Place New Order" />

      {/* ── Initial screen: order type choice ── */}
      {!orderType && (
        <section style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* Order type selection */}
          <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 13 }}>
            Choose how you'd like to place your order.
          </p>
          <div className="grid-2" style={{ gap: 16 }}>
            <div
              className="box"
              style={{ cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => setOrderType('package')}
            >
              <h3 style={{ marginBottom: 8 }}>Package Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Combine multiple print items (books, cards, posters…) into one order.
              </p>
            </div>
            <div
              className="box"
              style={{ cursor: 'pointer', transition: 'border-color .15s' }}
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

      {/* ── Package order ── */}
      {orderType === 'package' && (
        <>
          <button
            className="global-back-btn"
            style={{ marginBottom: 16 }}
            onClick={() => { setOrderType(null); setSelectedDocId(''); }}
          >
            ← Back
          </button>

          <section className="split" style={{ alignItems: 'flex-start' }}>

            {/* ── Left: form panels ── */}
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 style={{ marginBottom: 4 }}>Use a file from your library</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                    Select a saved file to use as the print file for your first item.
                  </p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--primary-soft)' : 'var(--surface-soft)',
                            transition: 'border-color .15s, background .15s',
                          }}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                            background: docTypeColor(doc.type),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#fff',
                          }}>
                            {doc.type}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {doc.reorderCount > 0 && <span style={{ marginLeft: 6, color: 'var(--primary)' }}>Ordered {doc.reorderCount}×</span>}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              background: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 12, fontWeight: 700,
                            }}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type picker */}
              <div className="box">
                <h3 style={{ marginBottom: 4 }}>Add Items to Your Package</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Click a product type to add it to your order.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {ITEM_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => addItem(t.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
                        border: '2px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--muted)',
                        fontWeight: 500, fontSize: 12, transition: 'all .15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-soft)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary-dark)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{t.icon}</span>
                      <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
                {items.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16, fontStyle: 'italic' }}>
                    No items added yet. Click a type above to add it.
                  </p>
                )}
              </div>

              {/* Item editors */}
              {items.map((item, idx) => (
                <ItemEditor
                  key={item.id}
                  item={item}
                  onChange={data => updateItem(item.id, data)}
                  onRemove={() => removeItem(item.id)}
                  libraryDoc={idx === 0 ? selectedDoc : null}
                  onClearLibraryDoc={() => setSelectedDocId('')}
                />
              ))}

              {/* Notes */}
              {items.length > 0 && (
                <div className="box">
                  <h3 style={{ marginBottom: 10 }}>Additional Notes</h3>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Special instructions, finishing details…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                </div>
              )}
            </div>

            {/* ── Right: summary sidebar ── */}
            <aside className="box" style={{ position: 'sticky', top: 18, alignSelf: 'flex-start' }}>
              <h3 style={{ marginBottom: 16 }}>Order Summary</h3>

              <div style={{ display: 'grid', gap: 10, fontSize: 13, marginBottom: 16 }}>
                {items.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No items added yet.</p>
                ) : (
                  items.map(i => {
                    const typeInfo = ITEM_TYPES.find(t => t.id === i.type)!;
                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span>
                          <span style={{ marginRight: 5 }}>{typeInfo.icon}</span>
                          {typeInfo.label}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>
                          {i.data.qty ? Number(i.data.qty).toLocaleString() + ' pcs' : '—'}
                        </span>
                      </div>
                    );
                  })
                )}

                {selectedDoc && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: 'var(--muted)', flexShrink: 0 }}>File</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedDoc.name}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  A price quote will be sent to you after submission.
                </p>
              </div>

              <button
                className="btn primary block"
                disabled={items.length === 0}
                onClick={() => setSubmitted(true)}
              >
                Submit Package
              </button>
            </aside>
          </section>
        </>
      )}

      {/* ── Single / Individual order ── */}
      {orderType === 'single' && (
        <>
          <button
            className="global-back-btn"
            style={{ marginBottom: 16 }}
            onClick={() => { setOrderType(null); setSingleType(''); setSingleData({}); setSelectedDocId(''); }}
          >
            ← Back
          </button>

          <section className="split" style={{ alignItems: 'flex-start' }}>

            {/* ── Left: form panels ── */}
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 style={{ marginBottom: 4 }}>Use a file from your library</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                    Select a saved file to use as your print file, or upload a new one below.
                  </p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--primary-soft)' : 'var(--surface-soft)',
                            transition: 'border-color .15s, background .15s',
                          }}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                            background: docTypeColor(doc.type),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#fff',
                          }}>
                            {doc.type}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {doc.reorderCount > 0 && <span style={{ marginLeft: 6, color: 'var(--primary)' }}>Ordered {doc.reorderCount}×</span>}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              background: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 12, fontWeight: 700,
                            }}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product type + specs */}
              <div className="box">
                <h3 style={{ marginBottom: 4 }}>What would you like to print?</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Pick a product type to configure your order.</p>

                {/* Visual type picker */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: singleType ? 20 : 0 }}>
                  {ITEM_TYPES.map(t => {
                    const active = singleType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSingleType(t.id as ItemType); setSingleData({}); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
                          border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                          background: active ? 'var(--primary-soft)' : 'var(--surface)',
                          color: active ? 'var(--primary-dark)' : 'var(--muted)',
                          fontWeight: active ? 700 : 500,
                          fontSize: 12, transition: 'all .15s',
                          boxShadow: active ? '0 0 0 3px rgba(31,181,178,0.12)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{t.icon}</span>
                        <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {singleType && (
                  <>
                    <div className="line" style={{ margin: '0 0 16px' }} />

                    {/* File & quantity */}
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>File & Quantity</p>
                    <FileField
                      label="Print File (PDF)"
                      value={singleData.pdf ?? null}
                      onChange={f => setSingleData(d => ({ ...d, pdf: f }))}
                      libraryDoc={selectedDoc}
                      onClearLibrary={() => setSelectedDocId('')}
                    />
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Quantity</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        placeholder="e.g. 500"
                        value={singleData.qty ?? ''}
                        onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))}
                      />
                    </div>

                    {/* Per-type specs */}
                    {singleType === 'book' && (
                      <>
                        <div className="line" style={{ margin: '0 0 16px' }} />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Book Specifications</p>
                        <FileField label="Cover File" value={singleData.cover ?? null} onChange={f => setSingleData(d => ({ ...d, cover: f }))} />
                        <div className="form-grid-2" style={{ marginTop: 4 }}>
                          <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={singleData.coverFinish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, coverFinish: v }))} />
                          <SelectField label="Colors" options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label="Size" options={['A4', 'A5']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label="Binding" options={['Softcover', 'Hardcover', 'Spiral']} value={singleData.casing ?? 'Softcover'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'booklet' && (
                      <>
                        <div className="line" style={{ margin: '0 0 16px' }} />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Booklet Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={singleData.weight ?? '150g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Size" options={['A4', 'A3 (Centerfold)']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Colors" options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label="Binding" options={['Staple', 'Glue']} value={singleData.casing ?? 'Staple'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'card' && (
                      <>
                        <div className="line" style={{ margin: '0 0 16px' }} />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Card Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Paper Weight" options={['200g', '300g', '400g']} value={singleData.weight ?? '300g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Size" options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={singleData.size ?? '6×9 cm'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Finish" options={['Matte', 'Glossy', 'UV']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'sticker' && (
                      <>
                        <div className="line" style={{ margin: '0 0 16px' }} />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Sticker Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={singleData.material ?? 'Vinyl'} onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                          <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={singleData.shape ?? 'Rectangle'} onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                          <SelectField label="Finish" options={['Glossy', 'Matte']} value={singleData.finish ?? 'Glossy'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'poster' && (
                      <>
                        <div className="line" style={{ margin: '0 0 16px' }} />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Poster Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={singleData.size ?? 'A3'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={singleData.weight ?? '200g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Finish" options={['Matte', 'Glossy']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Notes — only once a type is chosen */}
              {singleType && (
                <div className="box">
                  <h3 style={{ marginBottom: 10 }}>Additional Notes</h3>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Special instructions, finishing details…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                </div>
              )}
            </div>

            {/* ── Right: summary sidebar ── */}
            <aside className="box" style={{ position: 'sticky', top: 18, alignSelf: 'flex-start' }}>
              <h3 style={{ marginBottom: 16 }}>Order Summary</h3>

              <div style={{ display: 'grid', gap: 12, fontSize: 13, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Type</span>
                  {singleType ? (
                    <span style={{
                      fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontSize: 12,
                    }}>
                      {ITEM_TYPES.find(t => t.id === singleType)?.icon}&nbsp;
                      {ITEM_TYPES.find(t => t.id === singleType)?.label}
                    </span>
                  ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>File</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDoc ? selectedDoc.name : singleData.pdf ? (singleData.pdf as File).name : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Quantity</span>
                  <span style={{ fontWeight: 600 }}>
                    {singleData.qty ? Number(singleData.qty).toLocaleString() + ' pcs' : '—'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  A price quote will be sent to you after submission.
                </p>
              </div>

              <button
                className="btn primary block"
                disabled={!singleType}
                onClick={() => setSubmitted(true)}
              >
                Submit Order
              </button>
            </aside>
          </section>
        </>
      )}
    </AppShell>
  );
}

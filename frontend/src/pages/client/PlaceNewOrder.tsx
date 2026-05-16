import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { PdfPreviewPanel } from '../../components/PdfPreviewPanel';
import { createOrder } from '../../lib/api/ordersQuotesService';
import { createUpload, getUploads } from '../../lib/api/documentsProductionService';

type OrderType = 'package' | 'single' | null;
type ItemType = 'book' | 'booklet' | 'card' | 'sticker' | 'poster';

interface PackageItem {
  id: string;
  type: ItemType;
  data: Record<string, any>;
}

// Updated to match normalized documents.json
interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
  ownerType: 'client' | 'template' | 'order';
  ownerId: string;
  url?: string;
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

// ── Beautiful file field (browse button + library support) ──
function FileField({
  label,
  value,
  onChange,
  libraryDoc,
  onClearLibrary,
  onFilePreview,
}: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  libraryDoc?: ClientDocument | null;
  onClearLibrary?: () => void;
  onFilePreview?: (file: File | null) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If a library doc is selected and no new file picked, show the library badge
  if (libraryDoc && !value && !showPicker) {
    return (
      <div className="field mb-4">
        <label className="field-label">{label}</label>
        <div className="file-field__libraryItem">
          <div
            className="file-field__libraryBadge"
            style={{ background: docTypeColor(libraryDoc.type) }}
          >
            {libraryDoc.type}
          </div>
          <div className="file-field__libraryInfo">
            <div className="file-field__libraryName">{libraryDoc.name}</div>
            <div className="file-field__libraryFileName">{libraryDoc.fileName}</div>
          </div>
          <button
            className="btn btn--xs"
            onClick={() => {
              setShowPicker(true);
              onClearLibrary?.();
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field mb-4">
      <label className="field-label">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
          onFilePreview?.(file);
        }}
      />
      <button
        className="btn"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        📁 Browse...
      </button>
      {value && (
        <p className="file-field__selected">
          Selected: {value.name}
        </p>
      )}
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field mb-4">
      <label className="field-label">{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

const SPEC_LABEL: Record<string, string> = {
  book: 'Book Specifications', booklet: 'Booklet Specifications',
  card: 'Card Specifications', sticker: 'Sticker Specifications', poster: 'Poster Specifications',
};

// ── Item editor (now supports cover preview) ──
function ItemEditor({
  item,
  onChange,
  onRemove,
  libraryDoc,
  onClearLibraryDoc,
}: {
  item: PackageItem;
  onChange: (d: Record<string, any>) => void;
  onRemove: () => void;
  libraryDoc?: ClientDocument | null;
  onClearLibraryDoc?: () => void;
}) {
  const d = item.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const typeInfo = ITEM_TYPES.find(t => t.id === item.type)!;

  // Local main file preview
  const [localMainUrl, setLocalMainUrl] = useState<string | null>(null);
  const [localMainFile, setLocalMainFile] = useState<File | null>(null);

  useEffect(() => {
    const file = d.pdf;
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setLocalMainUrl(url);
      setLocalMainFile(file);
      return () => URL.revokeObjectURL(url);
    }
    setLocalMainUrl(null);
    setLocalMainFile(null);
  }, [d.pdf]);

  // Local cover file preview
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [localCoverFile, setLocalCoverFile] = useState<File | null>(null);

  useEffect(() => {
    const coverFile = d.cover;
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setLocalCoverUrl(url);
      setLocalCoverFile(coverFile);
      return () => URL.revokeObjectURL(url);
    }
    setLocalCoverUrl(null);
    setLocalCoverFile(null);
  }, [d.cover]);

  // Build documents for preview
  const previewDoc: ClientDocument | null = localMainFile
    ? {
        id: `${item.id}-main`,
        name: localMainFile.name,
        fileName: localMainFile.name,
        type: (localMainFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
        sizeKB: Math.round(localMainFile.size / 1024),
        uploadedDate: new Date().toLocaleDateString(),
        url: localMainUrl!,
        ownerType: 'client',
        ownerId: 'temp',
      }
    : libraryDoc ?? null;

  const coverPreviewDoc: ClientDocument | null = localCoverFile
    ? {
        id: `${item.id}-cover`,
        name: localCoverFile.name,
        fileName: localCoverFile.name,
        type: (localCoverFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
        sizeKB: Math.round(localCoverFile.size / 1024),
        uploadedDate: new Date().toLocaleDateString(),
        url: localCoverUrl!,
        ownerType: 'client',
        ownerId: 'temp',
      }
    : null;

  return (
    <div className="box">
      {/* Header */}
      <div className="item-editor__header">
        <div className="item-editor__typeInfo">
          <span className="item-editor__icon">{typeInfo.icon}</span>
          <span className="item-editor__label">{typeInfo.label}</span>
        </div>
        <button className="btn btn-sm" onClick={onRemove}>Remove</button>
      </div>

      <p className="spec-section-label">File & Quantity</p>
      <FileField
        label="Print File (PDF)"
        value={d.pdf ?? null}
        onChange={f => set('pdf', f)}
        libraryDoc={libraryDoc}
        onClearLibrary={onClearLibraryDoc}
      />
      <div className="field mb-4">
        <label className="field-label">Quantity</label>
        <input className="input" type="number" min={1} placeholder="e.g. 100" value={d.qty ?? ''} onChange={e => set('qty', e.target.value)} />
      </div>

      {/* Per-type specs – kept clean */}
      {item.type === 'book' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{SPEC_LABEL.book}</p>
          <FileField label="Cover File" value={d.cover ?? null} onChange={f => set('cover', f)} />
          {coverPreviewDoc && <PdfPreviewPanel doc={coverPreviewDoc} height={200} />}
          <div className="form-grid-2 mt-1">
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
          <div className="line line--compact" />
          <p className="spec-section-label">{SPEC_LABEL.booklet}</p>
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
          <div className="line line--compact" />
          <p className="spec-section-label">{SPEC_LABEL.card}</p>
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
          <div className="line line--compact" />
          <p className="spec-section-label">{SPEC_LABEL.sticker}</p>
          <div className="form-grid-2">
            <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={d.material ?? 'Vinyl'} onChange={v => set('material', v)} />
            <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={d.shape ?? 'Rectangle'} onChange={v => set('shape', v)} />
            <SelectField label="Finish" options={['Glossy', 'Matte']} value={d.finish ?? 'Glossy'} onChange={v => set('finish', v)} />
          </div>
        </>
      )}
      {item.type === 'poster' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{SPEC_LABEL.poster}</p>
          <div className="form-grid-2">
            <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={d.size ?? 'A3'} onChange={v => set('size', v)} />
            <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '200g'} onChange={v => set('weight', v)} />
            <SelectField label="Finish" options={['Matte', 'Glossy']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
            <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}

      {/* Main file preview at bottom */}
      {previewDoc && <PdfPreviewPanel doc={previewDoc} height={200} />}
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
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Document library
  const [docs, setDocs]               = useState<ClientDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');

  // Local previews for the SINGLE order page (not inside items)
  const [localSingleFile, setLocalSingleFile] = useState<File | null>(null);
  const [localSingleUrl, setLocalSingleUrl] = useState<string | null>(null);
  const [localCoverFile, setLocalCoverFile] = useState<File | null>(null);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);

  // Fetch the client's uploaded files to show in the document library
  useEffect(() => {
    getUploads()
      .then(res => {
        const mapped: ClientDocument[] = res.data.data.map(u => ({
          id: String(u.id),
          name: u.url.split('/').pop() ?? 'File',
          fileName: u.url.split('/').pop() ?? 'File',
          type: (u.url.split('.').pop() ?? 'PDF').toUpperCase(),
          sizeKB: 0,
          uploadedDate: '',
          reorderCount: 0,
          ownerType: 'client' as const,
          ownerId: String(u.uploaded_by),
          url: u.url,
        }));
        setDocs(mapped);
      })
      .catch(() => {});
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (localSingleUrl) URL.revokeObjectURL(localSingleUrl);
      if (localCoverUrl) URL.revokeObjectURL(localCoverUrl);
    };
  }, [localSingleUrl, localCoverUrl]);

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
    setLocalSingleFile(null);
    setLocalSingleUrl(null);
    setLocalCoverFile(null);
    setLocalCoverUrl(null);
  }

  // Handler for single order file previews
  const handleSingleFilePreview = useCallback((file: File | null) => {
    if (localSingleUrl) URL.revokeObjectURL(localSingleUrl);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalSingleUrl(url);
      setLocalSingleFile(file);
    } else {
      setLocalSingleUrl(null);
      setLocalSingleFile(null);
    }
  }, [localSingleUrl]);

  const handleCoverFilePreview = useCallback((file: File | null) => {
    if (localCoverUrl) URL.revokeObjectURL(localCoverUrl);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalCoverUrl(url);
      setLocalCoverFile(file);
    } else {
      setLocalCoverUrl(null);
      setLocalCoverFile(null);
    }
  }, [localCoverUrl]);

  if (submitted) {
    return (
      <AppShell role="client" activePage="place-new-order">
        <Topbar title="Place New Order" />
        <section className="box success-message">
          <div className="success-icon">✓</div>
          <h2>Order Submitted!</h2>
          <p className="success-subtext">
            We've received your order and will send you a quote shortly.
          </p>
          <div className="flex gap-3 center">
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

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── Order type choice ── */}
      {!orderType && (
        <section className="order-type-picker mx-auto">
          <p className="picker-intro">
            Choose how you'd like to place your order.
          </p>
          <div className="grid-2 gap-4">
            <div className="box picker-card" onClick={() => setOrderType('package')}>
              <h3 className="mb-2">Package Order</h3>
              <p className="picker-description">Combine multiple print items (books, cards, posters…) into one order.</p>
            </div>
            <div className="box picker-card" onClick={() => setOrderType('single')}>
              <h3 className="mb-2">Individual Order</h3>
              <p className="picker-description">Order a single print item with full customization options.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Package order ── */}
      {orderType === 'package' && (
        <>
          <button
            className="global-back-btn"
            onClick={() => { setOrderType(null); setSelectedDocId(''); }}
          >
            ← Back
          </button>

          <section className="split panel-wrapper">
            <div className="panel-left">
              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 className="doc-library__heading">Use a file from your library</h3>
                  <p className="doc-library__help">
                    Select a saved file to use as the print file for your first item.
                  </p>
                  <div className="doc-list">
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          className={`doc-list__item ${isSelected ? 'doc-list__item--selected' : ''}`}
                        >
                          <div
                            className="doc-list__badge"
                            style={{ background: docTypeColor(doc.type) }}
                          >
                            {doc.type}
                          </div>
                          <div className="doc-list__info">
                            <div className="doc-list__name">{doc.name}</div>
                            <div className="doc-list__meta">
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {doc.reorderCount > 0 && <span className="doc-list__reorder">Ordered {doc.reorderCount}×</span>}
                            </div>
                          </div>
                          {isSelected && <div className="doc-list__check">✓</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type picker */}
              <div className="box">
                <h3 className="add-items-heading">Add Items to Your Package</h3>
                <p className="add-items-help">Click a product type to add it to your order.</p>
                <div className="item-type-grid">
                  {ITEM_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => addItem(t.id)}
                      className="item-type-btn"
                    >
                      <span className="item-type-icon">{t.icon}</span>
                      <span className="item-type-label">{t.label}</span>
                    </button>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="no-items-hint">No items added yet. Click a type above to add it.</p>
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
                  <h3 className="notes-heading">Additional Notes</h3>
                  <textarea
                    className="input textarea"
                    rows={3}
                    placeholder="Special instructions, finishing details…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="sticky-panel box">
              <h3 className="summary__heading">Order Summary</h3>
              <div className="summary-rows">
                {items.length === 0 ? (
                  <p className="summary__empty">No items added yet.</p>
                ) : (
                  items.map(i => {
                    const typeInfo = ITEM_TYPES.find(t => t.id === i.type)!;
                    return (
                      <div key={i.id} className="summary-row">
                        <span><span className="mr-1">{typeInfo.icon}</span>{typeInfo.label}</span>
                        <span className="summary-row__value">
                          {i.data.qty ? Number(i.data.qty).toLocaleString() + ' pcs' : '—'}
                        </span>
                      </div>
                    );
                  })
                )}
                {selectedDoc && (
                  <div className="summary-row summary-row--file">
                    <span className="summary-row__label">File</span>
                    <span className="summary-row__file-value">{selectedDoc.name}</span>
                  </div>
                )}
              </div>
              <div className="summary-footer">
                <p className="summary-footer__text">A price quote will be sent to you after submission.</p>
              </div>
              <button
                className="btn primary block"
                disabled={items.length === 0 || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setError(null);
                  try {
                    const totalQty = items.reduce((sum, i) => sum + (Number(i.data.qty) || 1), 0);
                    await createOrder({ status: 'UNPRICED_PENDING', quantity: totalQty || 1, total_price: 0 });
                    setSubmitted(true);
                  } catch {
                    setError('Failed to submit order. Please try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Package'}
              </button>
            </aside>
          </section>
        </>
      )}

      {/* ── Single order ── */}
      {orderType === 'single' && (
        <>
          <button
            className="global-back-btn"
            onClick={() => { setOrderType(null); setSingleType(''); setSingleData({}); setSelectedDocId(''); }}
          >
            ← Back
          </button>

          <section className="split panel-wrapper">
            <div className="panel-left">
              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 className="doc-library__heading">Use a file from your library</h3>
                  <p className="doc-library__help">
                    Select a saved file to use as your print file, or upload a new one below.
                  </p>
                  <div className="doc-list">
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          className={`doc-list__item ${isSelected ? 'doc-list__item--selected' : ''}`}
                        >
                          <div
                            className="doc-list__badge"
                            style={{ background: docTypeColor(doc.type) }}
                          >
                            {doc.type}
                          </div>
                          <div className="doc-list__info">
                            <div className="doc-list__name">{doc.name}</div>
                            <div className="doc-list__meta">
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {doc.reorderCount > 0 && <span className="doc-list__reorder">Ordered {doc.reorderCount}×</span>}
                            </div>
                          </div>
                          {isSelected && <div className="doc-list__check">✓</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product type + specs */}
              <div className="box">
                <h3 className="single-type-heading">What would you like to print?</h3>
                <p className="single-type-help">Pick a product type to configure your order.</p>

                <div className="item-type-grid single-type-grid">
                  {ITEM_TYPES.map(t => {
                    const active = singleType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSingleType(t.id as ItemType); setSingleData({}); }}
                        className={`item-type-btn ${active ? 'item-type-btn--active' : ''}`}
                      >
                        <span className="item-type-icon">{t.icon}</span>
                        <span className="item-type-label">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {singleType && (
                  <>
                    <div className="line line--compact" />
                    <p className="spec-section-label">File & Quantity</p>
                    <FileField
                      label="Print File (PDF)"
                      value={singleData.pdf ?? null}
                      onChange={f => setSingleData(d => ({ ...d, pdf: f }))}
                      libraryDoc={selectedDoc}
                      onClearLibrary={() => setSelectedDocId('')}
                      onFilePreview={handleSingleFilePreview}
                    />
                    <div className="field mb-4">
                      <label className="field-label">Quantity</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        placeholder="e.g. 500"
                        value={singleData.qty ?? ''}
                        onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))}
                      />
                    </div>

                    {/* Per-type specs – same as ItemEditor */}
                    {singleType === 'book' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Book Specifications</p>
                        <FileField
                          label="Cover File"
                          value={singleData.cover ?? null}
                          onChange={f => setSingleData(d => ({ ...d, cover: f }))}
                          onFilePreview={handleCoverFilePreview}
                        />
                        {localCoverFile && (
                          <PdfPreviewPanel
                            doc={{
                              id: 'single-cover',
                              name: localCoverFile.name,
                              fileName: localCoverFile.name,
                              type: (localCoverFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
                              sizeKB: Math.round(localCoverFile.size / 1024),
                              uploadedDate: new Date().toLocaleDateString(),
                              url: localCoverUrl!,
                              ownerType: 'client',
                              ownerId: clientId,
                            }}
                            height={200}
                          />
                        )}
                        <div className="form-grid-2 mt-1">
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
                        <div className="line line--compact" />
                        <p className="spec-section-label">Booklet Specifications</p>
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
                        <div className="line line--compact" />
                        <p className="spec-section-label">Card Specifications</p>
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
                        <div className="line line--compact" />
                        <p className="spec-section-label">Sticker Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={singleData.material ?? 'Vinyl'} onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                          <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={singleData.shape ?? 'Rectangle'} onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                          <SelectField label="Finish" options={['Glossy', 'Matte']} value={singleData.finish ?? 'Glossy'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'poster' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Poster Specifications</p>
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

              {singleType && (
                <div className="box">
                  <h3 className="notes-heading">Additional Notes</h3>
                  <textarea
                    className="input textarea"
                    rows={3}
                    placeholder="Special instructions, finishing details…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="sticky-panel box">
              <h3 className="summary__heading">Order Summary</h3>
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="summary-row__label">Type</span>
                  {singleType ? (
                    <span className="summary-badge">
                      {ITEM_TYPES.find(t => t.id === singleType)?.icon}&nbsp;
                      {ITEM_TYPES.find(t => t.id === singleType)?.label}
                    </span>
                  ) : <span className="muted">—</span>}
                </div>
                <div className="summary-row summary-row--file">
                  <span className="summary-row__label">File</span>
                  <span className="summary-row__file-value">
                    {selectedDoc ? selectedDoc.name : localSingleFile ? localSingleFile.name : '—'}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">Quantity</span>
                  <span className="summary-row__value">
                    {singleData.qty ? Number(singleData.qty).toLocaleString() + ' pcs' : '—'}
                  </span>
                </div>
              </div>
              <div className="summary-footer">
                <p className="summary-footer__text">A price quote will be sent to you after submission.</p>
              </div>
              <button
                className="btn primary block"
                disabled={!singleType || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setError(null);
                  try {
                    if (singleData.pdf instanceof File) {
                      await createUpload({ file: singleData.pdf, file_type: 'content' });
                    }
                    if (singleData.cover instanceof File) {
                      await createUpload({ file: singleData.cover, file_type: 'cover' });
                    }
                    const qty = Number(singleData.qty) || 1;
                    await createOrder({ status: 'UNPRICED_PENDING', quantity: qty, total_price: 0 });
                    setSubmitted(true);
                  } catch {
                    setError('Failed to submit order. Please try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Order'}
              </button>
            </aside>
          </section>
        </>
      )}
    </AppShell>
  );
}
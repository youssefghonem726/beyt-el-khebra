import { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

// ── Inlined from types.ts ───────────────────────────────────────────
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
  reorderCount?: number;
  url?: string;
}

interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];
// ─────────────────────────────────────────────────────────────────────

import { DocLibrary } from '../../components/DocLibrary';
import { ItemEditor } from '../../components/ItemEditor';
import { FileField, SelectField } from '../../components/fields';
import { PdfPreviewPanel } from '../../components/PdfPreviewPanel';
import { PackageOrderSummary, SingleOrderSummary } from '../../components/OrderSummary';

type OrderType = 'package' | 'single' | null;

export default function OwnerPlaceOrder() {
  const [clients, setClients]               = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [orderType, setOrderType]           = useState<OrderType>(null);
  const [items, setItems]                   = useState<PackageItem[]>([]);
  const [singleType, setSingleType]         = useState<ItemType | ''>('');
  const [singleData, setSingleData]         = useState<Record<string, any>>({});
  const [allDocs, setAllDocs]               = useState<Record<string, ClientDocument[]>>({});
  const [selectedDocId, setSelectedDocId]   = useState('');
  const [notes, setNotes]                   = useState('');
  const [submitted, setSubmitted]           = useState(false);

  const [localPreviewFile, setLocalPreviewFile]       = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl]         = useState<string | null>(null);
  const [localCoverPreviewFile, setLocalCoverPreviewFile] = useState<File | null>(null);
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl]   = useState<string | null>(null);

  const handleLocalFilePreview = useCallback((file: File | null) => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);
      setLocalPreviewFile(file);
    } else {
      setLocalPreviewUrl(null);
      setLocalPreviewFile(null);
    }
  }, [localPreviewUrl]);

  const handleLocalCoverPreview = useCallback((file: File | null) => {
    if (localCoverPreviewUrl) URL.revokeObjectURL(localCoverPreviewUrl);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalCoverPreviewUrl(url);
      setLocalCoverPreviewFile(file);
    } else {
      setLocalCoverPreviewUrl(null);
      setLocalCoverPreviewFile(null);
    }
  }, [localCoverPreviewUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      if (localCoverPreviewUrl) URL.revokeObjectURL(localCoverPreviewUrl);
    };
  }, [localPreviewUrl, localCoverPreviewUrl]);

  useEffect(() => {
    fetch('/data/clients.json').then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/client-documents.json').then(r => r.json()).then(setAllDocs).catch(() => {});
  }, []);

  const chosenClient = clients.find(c => c.name === selectedClient);
  const clientDocs   = chosenClient ? (allDocs[selectedClient] ?? []) : [];
  const selectedDoc  = clientDocs.find(d => d.id === selectedDocId) ?? null;

  function resetOrder() {
    setOrderType(null);
    setItems([]);
    setSingleType('');
    setSingleData({});
    setSelectedDocId('');
    setNotes('');
    setLocalPreviewFile(null);
    if (localPreviewUrl) { URL.revokeObjectURL(localPreviewUrl); setLocalPreviewUrl(null); }
    setLocalCoverPreviewFile(null);
    if (localCoverPreviewUrl) { URL.revokeObjectURL(localCoverPreviewUrl); setLocalCoverPreviewUrl(null); }
  }

  function resetAll() {
    setSelectedClient('');
    resetOrder();
    setSubmitted(false);
  }

  const addItem    = (type: ItemType) => setItems(p => [...p, { id: crypto.randomUUID(), type, data: {} }]);
  const updateItem = (id: string, data: Record<string, any>) => setItems(p => p.map(i => i.id === id ? { ...i, data } : i));
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  if (submitted) {
    return (
      <AppShell role="owner" activePage="owner-place-order">
        <Topbar title="Place Order" />
        <section className="box success-message">
          <div className="success-icon">✓</div>
          <h2>Order Placed!</h2>
          <p className="success-subtext">
            Assigned to <strong>{selectedClient}</strong>
          </p>
          <p className="success-subtext">
            {orderType === 'package'
              ? `${items.length} item${items.length !== 1 ? 's' : ''} in package`
              : `${ITEM_TYPES.find(t => t.id === singleType)?.label} · ${singleData.qty ? Number(singleData.qty).toLocaleString() + ' pcs' : '—'}`
            }
          </p>
          <button className="btn primary" onClick={resetAll}>Place Another Order</button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-place-order">
      <Topbar title="Place Order" />

      {/* ── Client selector ── */}
      <section className="box mb-5">
        <h3 className="section-heading">Select Client</h3>
        <div className="client-selector">
          <div className="client-search">
            <label className="field-label">Client</label>
            <input
              className="input"
              type="text"
              list="owner-clients-list"
              placeholder="Type or search for a client…"
              value={selectedClient}
              onChange={e => { setSelectedClient(e.target.value); resetOrder(); }}
              autoComplete="off"
            />
            <datalist id="owner-clients-list">
              {clients.map(c => <option key={c.name} value={c.name} />)}
            </datalist>
            {selectedClient && !chosenClient && (
              <p className="new-client-hint">
                New client — no existing record found.
              </p>
            )}
          </div>
          {chosenClient && (
            <div className="client-card-mini">
              <span className="client-card-mini__name">{chosenClient.name}</span>
              <span className="client-card-mini__detail">{chosenClient.email}</span>
              <span className="client-card-mini__detail">{chosenClient.phone}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Order type picker ── */}
      {!!selectedClient && !orderType && (
        <section className="order-type-picker">
          <p className="picker-intro">
            Choose how you'd like to place this order for <strong>{selectedClient}</strong>.
          </p>
          <div className="grid-2">
            <div className="box picker-card" onClick={() => setOrderType('package')}>
              <h3>Package Order</h3>
              <p>Combine multiple print items (books, cards, posters…) into one order.</p>
            </div>
            <div className="box picker-card" onClick={() => setOrderType('single')}>
              <h3>Individual Order</h3>
              <p>Order a single print item with full customization options.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Package order ── */}
      {orderType === 'package' && (
        <>
          <button className="global-back-btn" onClick={resetOrder}>← Back</button>
          <section className="split panel-wrapper">
            <div className="panel-left">
              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              <div className="box">
                <h3 className="add-items-heading">Add Items to Your Package</h3>
                <p className="add-items-help">Click a product type to add it to the order.</p>
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
                  <p className="no-items-hint">No items added yet.</p>
                )}
              </div>

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

              {items.length > 0 && (
                <div className="box">
                  <h3 className="notes-heading">Additional Notes</h3>
                  <textarea className="input textarea" rows={3} placeholder="Special instructions, finishing details…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            <aside className="sticky-panel">
              <PackageOrderSummary
                selectedClient={selectedClient}
                items={items}
                selectedDoc={selectedDoc}
                onSubmit={() => setSubmitted(true)}
              />
            </aside>
          </section>
        </>
      )}

      {/* ── Individual order ── */}
      {orderType === 'single' && (
        <>
          <button className="global-back-btn" onClick={resetOrder}>← Back</button>
          <section className="split panel-wrapper">
            <div className="panel-left">
              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              <div className="box">
                <h3 className="single-type-heading">What would you like to print?</h3>
                <p className="single-type-help">Pick a product type to configure the order.</p>

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
                      onFilePreview={handleLocalFilePreview}
                    />
                    <div className="field mb-4">
                      <label className="field-label">Quantity</label>
                      <input className="input" type="number" min={1} placeholder="e.g. 500" value={singleData.qty ?? ''} onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))} />
                    </div>

                    {singleType === 'book' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Book Specifications</p>
                        <FileField label="Cover File" value={singleData.cover ?? null} onChange={f => setSingleData(d => ({ ...d, cover: f }))} onFilePreview={handleLocalCoverPreview} />
                        {localCoverPreviewFile && (
                          <PdfPreviewPanel
                            doc={{
                              id: 'single-cover-preview',
                              name: localCoverPreviewFile.name,
                              fileName: localCoverPreviewFile.name,
                              type: (localCoverPreviewFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
                              sizeKB: Math.round(localCoverPreviewFile.size / 1024),
                              uploadedDate: new Date().toLocaleDateString(),
                              url: localCoverPreviewUrl!,
                            }}
                            height={200}
                          />
                        )}
                        <div className="form-grid-2 mt-1">
                          <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={singleData.coverFinish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, coverFinish: v }))} />
                          <SelectField label="Colors"       options={['B&W', 'Colors']}                 value={singleData.colors ?? 'Colors'}      onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label="Size"         options={['A4', 'A5']}                       value={singleData.size ?? 'A4'}            onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Print Type"   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label="Binding"      options={['Softcover', 'Hardcover', 'Spiral']} value={singleData.casing ?? 'Softcover'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'booklet' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Booklet Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Paper Weight" options={['150g', '200g', '300g']}         value={singleData.weight ?? '150g'}        onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Size"         options={['A4', 'A3 (Centerfold)']}         value={singleData.size ?? 'A4'}            onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Colors"       options={['B&W', 'Colors']}                 value={singleData.colors ?? 'Colors'}      onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label="Print Type"   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label="Binding"      options={['Staple', 'Glue']}                 value={singleData.casing ?? 'Staple'}     onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'card' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Card Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Paper Weight" options={['200g', '300g', '400g']}          value={singleData.weight ?? '300g'}        onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Size"         options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={singleData.size ?? '6×9 cm'}   onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Finish"       options={['Matte', 'Glossy', 'UV']}          value={singleData.finish ?? 'Matte'}      onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label="Print Type"   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'sticker' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Sticker Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']}            value={singleData.material ?? 'Vinyl'}    onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                          <SelectField label="Shape"    options={['Rectangle', 'Circle', 'Custom']}      value={singleData.shape ?? 'Rectangle'}   onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                          <SelectField label="Finish"   options={['Glossy', 'Matte']}                    value={singleData.finish ?? 'Glossy'}     onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'poster' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">Poster Specifications</p>
                        <div className="form-grid-2">
                          <SelectField label="Size"         options={['A3', 'A2', 'A1', 'A0']}          value={singleData.size ?? 'A3'}           onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label="Paper Weight" options={['150g', '200g', '300g']}           value={singleData.weight ?? '200g'}       onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label="Finish"       options={['Matte', 'Glossy']}                value={singleData.finish ?? 'Matte'}      onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label="Print Type"   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front'}   onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {singleType && (
                <div className="box">
                  <h3 className="notes-heading">Additional Notes</h3>
                  <textarea className="input textarea" rows={3} placeholder="Special instructions, finishing details…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            <aside className="sticky-panel">
              <SingleOrderSummary
                selectedClient={selectedClient}
                singleType={singleType}
                singleData={singleData}
                selectedDoc={selectedDoc}
                localPreviewFile={localPreviewFile}
                onSubmit={() => setSubmitted(true)}
              />
              {(selectedDoc || localPreviewFile) && (
                <PdfPreviewPanel
                  doc={
                    selectedDoc
                      ? selectedDoc
                      : {
                          id: 'local-preview',
                          name: localPreviewFile!.name,
                          fileName: localPreviewFile!.name,
                          type: (localPreviewFile!.name.split('.').pop() ?? 'PDF').toUpperCase(),
                          sizeKB: Math.round(localPreviewFile!.size / 1024),
                          uploadedDate: new Date().toLocaleDateString(),
                          url: localPreviewUrl!,
                        }
                  }
                />
              )}
            </aside>
          </section>
        </>
      )}
    </AppShell>
  );
}
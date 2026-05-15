import { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
// ─── API imports ──────────────────────────────────────────────────────────
import { getClients, getDocuments } from '../../lib/api';

// ── Types (unchanged) ────────────────────────────────────────────────────
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
  ownerType: 'client' | 'template' | 'order';
  ownerId: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  since: string | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
  };
}

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];

import { DocLibrary } from '../../components/DocLibrary';
import { ItemEditor } from '../../components/ItemEditor';
import { FileField, SelectField } from '../../components/fields';
import { PdfPreviewPanel } from '../../components/PdfPreviewPanel';
import { PackageOrderSummary, SingleOrderSummary } from '../../components/OrderSummary';

type OrderType = 'package' | 'single' | null;

export default function OwnerPlaceOrder() {
  const [clients, setClients]               = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [orderType, setOrderType]           = useState<OrderType>(null);
  const [items, setItems]                   = useState<PackageItem[]>([]);
  const [singleType, setSingleType]         = useState<ItemType | ''>('');
  const [singleData, setSingleData]         = useState<Record<string, any>>({});
  const [allDocs, setAllDocs]               = useState<ClientDocument[]>([]);
  const [selectedDocId, setSelectedDocId]   = useState('');
  const [notes, setNotes]                   = useState('');
  const [submitted, setSubmitted]           = useState(false);

  // ── New client creation state ──────────────────────────────────────────
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName]         = useState('');
  const [newClientEmail, setNewClientEmail]       = useState('');
  const [newClientPhone, setNewClientPhone]       = useState('');

  const [localPreviewFile, setLocalPreviewFile]       = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl]         = useState<string | null>(null);
  const [localCoverPreviewFile, setLocalCoverPreviewFile] = useState<File | null>(null);
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl]   = useState<string | null>(null);

  // ── Document -> Item type selector ─────────────────────────────────────
  const [docItemType, setDocItemType] = useState<ItemType>('card');

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
    (async () => {
      try {
        const res = await getClients();
        setClients(res.data.data.results);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDocuments();
        setAllDocs(res.data.data);
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    })();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientDocs = allDocs.filter(doc => doc.ownerType === 'client' && doc.ownerId === selectedClientId);
  const selectedDoc = clientDocs.find(d => d.id === selectedDocId) ?? null;

  // ── Helpers (unchanged) ──────────────────────────────────────────────────
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
    setDocItemType('card');
  }

  function resetAll() {
    setSelectedClientId('');
    resetOrder();
    setSubmitted(false);
  }

  const addItem    = (type: ItemType) => setItems(p => [...p, { id: crypto.randomUUID(), type, data: {} }]);
  const updateItem = (id: string, data: Record<string, any>) => setItems(p => p.map(i => i.id === id ? { ...i, data } : i));
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  // ── Add selected document as a new package item ────────────────────────
  const handleAddDocumentAsItem = () => {
    if (!selectedDoc) return;
    const newItem: PackageItem = {
      id: crypto.randomUUID(),
      type: docItemType,
      data: {
        docId: selectedDoc.id,
        docName: selectedDoc.name,
        docFileName: selectedDoc.fileName,
      },
    };
    setItems(prev => [...prev, newItem]);
    // Do not clear selection – document can be used as attachment and as item
  };

  // ── Client selection / creation ────────────────────────────────────────
  const handleClientNameChange = (name: string) => {
    const found = clients.find(c => c.name === name);
    if (found) {
      setSelectedClientId(found.id);
      resetOrder();
      setShowNewClientForm(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
    } else {
      setSelectedClientId('');
      setNewClientName(name);
      setShowNewClientForm(true);
    }
  };

  const createNewClient = () => {
    if (!newClientName.trim()) return;
    const newId = `CL-${crypto.randomUUID().slice(0, 6)}`;
    const newClient: Client = {
      id: newId,
      name: newClientName,
      email: newClientEmail || '',
      phone: newClientPhone || '',
      address: '',
      taxId: '',
      since: null,
      stats: { totalOrders: 0, totalSpent: 0 },
    };
    console.log('[MOCK] Creating new client:', newClient);
    setClients(prev => [...prev, newClient]);
    setSelectedClientId(newId);
    resetOrder();
    setShowNewClientForm(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
  };

  // ── Order submission handlers ───────────────────────────────────────────
  const handlePackageSubmit = async (pkgItems: PackageItem[], doc: ClientDocument | null, clientName: string) => {
    const orderData = {
      type: 'package',
      client: clientName,
      clientId: selectedClientId,
      items: pkgItems,
      attachedDocumentId: doc?.id ?? null,
      notes,
    };
    console.log('[MOCK] Submitting package order:', orderData);
    setSubmitted(true);
  };

  const handleSingleSubmit = async (
    itemType: string,
    data: Record<string, any>,
    doc: ClientDocument | null,
    previewFile: File | null,
    clientName: string
  ) => {
    const orderData = {
      type: 'single',
      client: clientName,
      clientId: selectedClientId,
      itemType,
      specs: data,
      attachedDocumentId: doc?.id ?? null,
      previewFile: previewFile ? { name: previewFile.name, size: previewFile.size } : null,
      notes,
    };
    console.log('[MOCK] Submitting single order:', orderData);
    setSubmitted(true);
  };

  // ── Submission success view ─────────────────────────────────────────────
  if (submitted) {
    return (
      <AppShell role="owner" activePage="owner-place-order">
        <Topbar title="Place Order" />
        <section className="box success-message">
          <div className="success-icon">✓</div>
          <h2>Order Placed!</h2>
          <p className="success-subtext">
            Assigned to <strong>{selectedClient?.name ?? 'Client'}</strong>
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

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <AppShell role="owner" activePage="owner-place-order">
      <Topbar title="Place Order" />

      {/* Client selector (unchanged) */}
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
              value={selectedClient?.name ?? ''}
              onChange={e => handleClientNameChange(e.target.value)}
              autoComplete="off"
            />
            <datalist id="owner-clients-list">
              {clients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          {selectedClient && (
            <div className="client-card-mini">
              <span className="client-card-mini__name">{selectedClient.name}</span>
              <span className="client-card-mini__detail">{selectedClient.email}</span>
              <span className="client-card-mini__detail">{selectedClient.phone}</span>
            </div>
          )}
          {showNewClientForm && (
            <div className="box mt-3 p-3" style={{ background: '#f8f9ff' }}>
              <h4 style={{ marginTop: 0 }}>Create New Client</h4>
              <div className="form-grid-2">
                <div className="field">
                  <label className="field-label">Full Name *</label>
                  <input className="input" type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Client name" />
                </div>
                <div className="field">
                  <label className="field-label">Email</label>
                  <input className="input" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="e.g. client@example.com" />
                </div>
                <div className="field">
                  <label className="field-label">Phone</label>
                  <input className="input" type="text" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+20 1xx xxx xxxx" />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={createNewClient}>Create & Select</button>
                <button className="btn" onClick={() => { setShowNewClientForm(false); setNewClientName(''); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Order type picker */}
      {selectedClient && !orderType && (
        <section className="order-type-picker">
          <p className="picker-intro">
            Choose how you'd like to place this order for <strong>{selectedClient.name}</strong>.
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

      {/* Package order UI */}
      {orderType === 'package' && selectedClient && (
        <>
          <button className="global-back-btn" onClick={resetOrder}>← Back</button>
          <section className="split panel-wrapper">
            <div className="panel-left">
              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              {/* NEW: Add selected document as item */}
              {selectedDocId && selectedDoc && (
                <div className="box" style={{ marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>Add document as item</h4>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedDoc.name}</span>
                    <select
                      className="select"
                      value={docItemType}
                      onChange={e => setDocItemType(e.target.value as ItemType)}
                      style={{ width: 160 }}
                    >
                      {ITEM_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                    <button className="btn primary" onClick={handleAddDocumentAsItem}>
                      Add as Item
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    This will create a new {ITEM_TYPES.find(t => t.id === docItemType)?.label} item referencing this document.
                  </p>
                </div>
              )}

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
                selectedClient={selectedClient.name}
                items={items}
                selectedDoc={selectedDoc}
                onSubmit={() => handlePackageSubmit(items, selectedDoc, selectedClient.name)}
              />
            </aside>
          </section>
        </>
      )}

      {/* Individual order UI (unchanged) */}
      {orderType === 'single' && selectedClient && (
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
                selectedClient={selectedClient.name}
                singleType={singleType}
                singleData={singleData}
                selectedDoc={selectedDoc}
                localPreviewFile={localPreviewFile}
                onSubmit={() => handleSingleSubmit(singleType, singleData, selectedDoc, localPreviewFile, selectedClient.name)}
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
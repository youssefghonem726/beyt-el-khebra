import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
// ─── API imports ──────────────────────────────────────────────────────────
import { getClients, createClientUser } from '../../lib/api/invoicesClientsSettingsService';
import { createOrder } from '../../lib/api/ordersQuotesService';
import { createUpload } from '../../lib/api/documentsProductionService';
import { getDocuments } from '../../lib/api';

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

// English labels kept intentionally — used for backend API calls via getItemLabel
const ITEM_TYPES: { id: ItemType; labelEn: string; icon: string }[] = [
  { id: 'book',    labelEn: 'Book',          icon: '📚' },
  { id: 'booklet', labelEn: 'Booklet',       icon: '📖' },
  { id: 'card',    labelEn: 'Business Card', icon: '🃏' },
  { id: 'sticker', labelEn: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  labelEn: 'Poster',        icon: '🖼️' },
];

const getItemLabel = (type: string): string =>
  ITEM_TYPES.find(t => t.id === type)?.labelEn ?? type;

const buildOrderItemNotes = (data: Record<string, any>, extraNotes = ''): string => {
  const specs = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && !(value instanceof File))
    .map(([key, value]) => `${key}: ${String(value)}`);

  return [...specs, extraNotes.trim()].filter(Boolean).join('\n');
};

import { DocLibrary } from '../../components/DocLibrary';
import { ItemEditor } from '../../components/ItemEditor';
import { FileField, SelectField } from '../../components/fields';
import { PdfPreviewPanel } from '../../components/PdfPreviewPanel';
import { PackageOrderSummary, SingleOrderSummary } from '../../components/OrderSummary';

type OrderType = 'package' | 'single' | null;

export default function OwnerPlaceOrder() {
  return (
    <Suspense fallback={null}>
      <OwnerPlaceOrderInner />
    </Suspense>
  );
}

function OwnerPlaceOrderInner() {
  const { t } = useTranslation(['common', 'ownerPlaceOrder']);

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

  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName]         = useState('');
  const [newClientEmail, setNewClientEmail]       = useState('');
  const [newClientPhone, setNewClientPhone]       = useState('');

  const [submitting, setSubmitting]                   = useState(false);
  const [creatingClient, setCreatingClient]           = useState(false);
  const [error, setError]                             = useState<string | null>(null);

  const [localPreviewFile, setLocalPreviewFile]       = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl]         = useState<string | null>(null);
  const [localCoverPreviewFile, setLocalCoverPreviewFile] = useState<File | null>(null);
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl]   = useState<string | null>(null);

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
        setError(t('ownerPlaceOrder:errors.loadClients'));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDocuments();
        setAllDocs(res.data.data.map(doc => ({
          ...doc,
          ownerId: doc.ownerId ?? '',
        })));
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    })();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientDocs = allDocs.filter(doc => doc.ownerType === 'client' && doc.ownerId === selectedClientId);
  const selectedDoc = clientDocs.find(d => d.id === selectedDocId) ?? null;

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
  };

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

  const createNewClient = async () => {
    if (!newClientName.trim()) return;

    const parts = newClientName.trim().split(' ');
    const first_name = parts[0];
    const last_name = parts.slice(1).join(' ');

    setCreatingClient(true);
    setError(null);
    try {
      const res = await createClientUser({
        first_name,
        last_name: last_name || '',
        email: newClientEmail,
        phone: newClientPhone || undefined,
      });
      const u = res.data.data;
      const newClient: Client = {
        id: String(u.id),
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        phone: u.phone ?? '',
        address: '',
        taxId: '',
        since: null,
        stats: { totalOrders: 0, totalSpent: 0 },
      };
      setClients(prev => [...prev, newClient]);
      setSelectedClientId(newClient.id);
      resetOrder();
      setShowNewClientForm(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
    } catch (err) {
      console.error('Failed to create client:', err);
      setError(t('ownerPlaceOrder:errors.createClient'));
    } finally {
      setCreatingClient(false);
    }
  };

  const handlePackageSubmit = async (pkgItems: PackageItem[], _doc: ClientDocument | null, _clientName: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const totalQty = pkgItems.reduce((sum, item) => sum + (Number(item.data.qty) || 1), 0);
      await createOrder({
        status: 'UNPRICED_PENDING',
        quantity: totalQty || 1,
        total_price: 0,
        customer_id: Number(selectedClientId),
        order_items: pkgItems.map(item => ({
          item_type: getItemLabel(item.type),
          quantity: Number(item.data.qty) || 1,
          notes: buildOrderItemNotes(item.data, notes),
        })),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(t('ownerPlaceOrder:errors.placeOrder'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleSubmit = async (
    _itemType: string,
    data: Record<string, any>,
    _doc: ClientDocument | null,
    previewFile: File | null,
    _clientName: string
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      if (previewFile) {
        await createUpload({ file: previewFile, file_type: 'content' });
      }
      if (data.cover instanceof File) {
        await createUpload({ file: data.cover, file_type: 'cover' });
      }

      const qty = Number(data.qty) || 1;
      await createOrder({
        status: 'UNPRICED_PENDING',
        quantity: qty,
        total_price: 0,
        customer_id: Number(selectedClientId),
        order_items: [
          {
            item_type: getItemLabel(_itemType),
            quantity: qty,
            notes: buildOrderItemNotes(data, notes),
          },
        ],
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(t('ownerPlaceOrder:errors.placeOrder'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submission success view ─────────────────────────────────────────────
  if (submitted) {
    const packageSummary = items.length === 1
      ? t('ownerPlaceOrder:success.packageItemSingular', { count: 1 })
      : t('ownerPlaceOrder:success.packageItemPlural', { count: items.length });

    const singleSummary = singleType
      ? `${t(`ownerPlaceOrder:itemTypes.${singleType}`)} · ${singleData.qty
          ? t('ownerPlaceOrder:success.pcs', { count: Number(singleData.qty).toLocaleString() })
          : '—'}`
      : '';

    return (
      <AppShell role="owner" activePage="owner-place-order">
        <Topbar title={t('ownerPlaceOrder:title')} />
        <section className="box success-message">
          <div className="success-icon">✓</div>
          <h2>{t('ownerPlaceOrder:success.title')}</h2>
          <p className="success-subtext">
            {t('ownerPlaceOrder:success.assignedTo', { name: selectedClient?.name ?? 'Client' })}
          </p>
          <p className="success-subtext">
            {orderType === 'package' ? packageSummary : singleSummary}
          </p>
          <button className="btn primary" onClick={resetAll}>
            {t('ownerPlaceOrder:success.placeAnother')}
          </button>
        </section>
      </AppShell>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <AppShell role="owner" activePage="owner-place-order">
      <Topbar title={t('ownerPlaceOrder:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Client selector */}
      <section className="box mb-5">
        <h3 className="section-heading">{t('ownerPlaceOrder:client.sectionTitle')}</h3>
        <div className="client-selector">
          <div className="client-search">
            <label className="field-label">{t('ownerPlaceOrder:client.label')}</label>
            <input
              className="input"
              type="text"
              list="owner-clients-list"
              placeholder={t('ownerPlaceOrder:client.placeholder')}
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
              <h4 style={{ marginTop: 0 }}>{t('ownerPlaceOrder:client.newClientForm.title')}</h4>
              <div className="form-grid-2">
                <div className="field">
                  <label className="field-label">{t('ownerPlaceOrder:client.newClientForm.fullName')}</label>
                  <input className="input" type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder={t('ownerPlaceOrder:client.newClientForm.namePlaceholder')} />
                </div>
                <div className="field">
                  <label className="field-label">{t('ownerPlaceOrder:client.newClientForm.email')}</label>
                  <input className="input" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder={t('ownerPlaceOrder:client.newClientForm.emailPlaceholder')} />
                </div>
                <div className="field">
                  <label className="field-label">{t('ownerPlaceOrder:client.newClientForm.phone')}</label>
                  <input className="input" type="text" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder={t('ownerPlaceOrder:client.newClientForm.phonePlaceholder')} />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={createNewClient} disabled={creatingClient}>
                  {creatingClient ? t('ownerPlaceOrder:client.newClientForm.creating') : t('ownerPlaceOrder:client.newClientForm.createAndSelect')}
                </button>
                <button className="btn" onClick={() => { setShowNewClientForm(false); setNewClientName(''); }}>
                  {t('ownerPlaceOrder:client.newClientForm.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Order type picker */}
      {selectedClient && !orderType && (
        <section className="order-type-picker">
          <p className="picker-intro">
            {t('ownerPlaceOrder:picker.intro', { name: selectedClient.name })}
          </p>
          <div className="grid-2">
            <div className="box picker-card" onClick={() => setOrderType('package')}>
              <h3>{t('ownerPlaceOrder:picker.package.title')}</h3>
              <p>{t('ownerPlaceOrder:picker.package.description')}</p>
            </div>
            <div className="box picker-card" onClick={() => setOrderType('single')}>
              <h3>{t('ownerPlaceOrder:picker.single.title')}</h3>
              <p>{t('ownerPlaceOrder:picker.single.description')}</p>
            </div>
          </div>
        </section>
      )}

      {/* Package order UI */}
      {orderType === 'package' && selectedClient && (
        <>
          <button className="global-back-btn" onClick={resetOrder}>{t('ownerPlaceOrder:back')}</button>
          <section className="split panel-wrapper">
            <div className="panel-left">
              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              {selectedDocId && selectedDoc && (
                <div className="box" style={{ marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>{t('ownerPlaceOrder:addDocAsItem.title')}</h4>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedDoc.name}</span>
                    <select
                      className="select"
                      value={docItemType}
                      onChange={e => setDocItemType(e.target.value as ItemType)}
                      style={{ width: 160 }}
                    >
                      {ITEM_TYPES.map(itemType => (
                        <option key={itemType.id} value={itemType.id}>
                          {itemType.icon} {t(`ownerPlaceOrder:itemTypes.${itemType.id}`)}
                        </option>
                      ))}
                    </select>
                    <button className="btn primary" onClick={handleAddDocumentAsItem}>
                      {t('ownerPlaceOrder:addDocAsItem.addButton')}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    {t('ownerPlaceOrder:addDocAsItem.hint', { type: t(`ownerPlaceOrder:itemTypes.${docItemType}`) })}
                  </p>
                </div>
              )}

              <div className="box">
                <h3 className="add-items-heading">{t('ownerPlaceOrder:addItems.title')}</h3>
                <p className="add-items-help">{t('ownerPlaceOrder:addItems.help')}</p>
                <div className="item-type-grid">
                  {ITEM_TYPES.map(itemType => (
                    <button key={itemType.id} onClick={() => addItem(itemType.id)} className="item-type-btn">
                      <span className="item-type-icon">{itemType.icon}</span>
                      <span className="item-type-label">{t(`ownerPlaceOrder:itemTypes.${itemType.id}`)}</span>
                    </button>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="no-items-hint">{t('ownerPlaceOrder:addItems.empty')}</p>
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
                  <h3 className="notes-heading">{t('ownerPlaceOrder:notes.title')}</h3>
                  <textarea className="input textarea" rows={3} placeholder={t('ownerPlaceOrder:notes.placeholder')} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            <aside className="sticky-panel">
              <PackageOrderSummary
                selectedClient={selectedClient.name}
                items={items}
                selectedDoc={selectedDoc}
                onSubmit={() => { if (!submitting) handlePackageSubmit(items, selectedDoc, selectedClient.name); }}
              />
            </aside>
          </section>
        </>
      )}

      {/* Individual order UI */}
      {orderType === 'single' && selectedClient && (
        <>
          <button className="global-back-btn" onClick={resetOrder}>{t('ownerPlaceOrder:back')}</button>
          <section className="split panel-wrapper">
            <div className="panel-left">
              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              <div className="box">
                <h3 className="single-type-heading">{t('ownerPlaceOrder:singleType.title')}</h3>
                <p className="single-type-help">{t('ownerPlaceOrder:singleType.help')}</p>

                <div className="item-type-grid single-type-grid">
                  {ITEM_TYPES.map(itemType => {
                    const active = singleType === itemType.id;
                    return (
                      <button
                        key={itemType.id}
                        onClick={() => { setSingleType(itemType.id as ItemType); setSingleData({}); }}
                        className={`item-type-btn ${active ? 'item-type-btn--active' : ''}`}
                      >
                        <span className="item-type-icon">{itemType.icon}</span>
                        <span className="item-type-label">{t(`ownerPlaceOrder:itemTypes.${itemType.id}`)}</span>
                      </button>
                    );
                  })}
                </div>

                {singleType && (
                  <>
                    <div className="line line--compact" />
                    <p className="spec-section-label">{t('ownerPlaceOrder:shared.fileAndQty')}</p>
                    <FileField
                      label={t('ownerPlaceOrder:shared.printFile')}
                      value={singleData.pdf ?? null}
                      onChange={f => setSingleData(d => ({ ...d, pdf: f }))}
                      libraryDoc={selectedDoc}
                      onClearLibrary={() => setSelectedDocId('')}
                      onFilePreview={handleLocalFilePreview}
                    />
                    <div className="field mb-4">
                      <label className="field-label">{t('ownerPlaceOrder:shared.quantity')}</label>
                      <input className="input" type="number" min={1} placeholder={t('ownerPlaceOrder:shared.qtyPlaceholderSingle')} value={singleData.qty ?? ''} onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))} />
                    </div>

                    {singleType === 'book' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('ownerPlaceOrder:shared.specs.book')}</p>
                        <FileField label={t('ownerPlaceOrder:shared.fields.coverFile')} value={singleData.cover ?? null} onChange={f => setSingleData(d => ({ ...d, cover: f }))} onFilePreview={handleLocalCoverPreview} />
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
                          <SelectField label={t('ownerPlaceOrder:shared.fields.coverFinish')} options={['Matte', 'Shiny', 'Transparent']} value={singleData.coverFinish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, coverFinish: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.colors')}      options={['B&W', 'Colors']}                 value={singleData.colors ?? 'Colors'}      onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.size')}        options={['A4', 'A5']}                       value={singleData.size ?? 'A4'}            onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.printType')}   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.binding')}     options={['Softcover', 'Hardcover', 'Spiral']} value={singleData.casing ?? 'Softcover'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'booklet' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('ownerPlaceOrder:shared.specs.booklet')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('ownerPlaceOrder:shared.fields.paperWeight')} options={['150g', '200g', '300g']}         value={singleData.weight ?? '150g'}        onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.size')}        options={['A4', 'A3 (Centerfold)']}         value={singleData.size ?? 'A4'}            onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.colors')}      options={['B&W', 'Colors']}                 value={singleData.colors ?? 'Colors'}      onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.printType')}   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.binding')}     options={['Staple', 'Glue']}                 value={singleData.casing ?? 'Staple'}     onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'card' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('ownerPlaceOrder:shared.specs.card')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('ownerPlaceOrder:shared.fields.paperWeight')} options={['200g', '300g', '400g']}          value={singleData.weight ?? '300g'}        onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.size')}        options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={singleData.size ?? '6×9 cm'}   onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.finish')}      options={['Matte', 'Glossy', 'UV']}          value={singleData.finish ?? 'Matte'}      onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.printType')}   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'sticker' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('ownerPlaceOrder:shared.specs.sticker')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('ownerPlaceOrder:shared.fields.material')} options={['Vinyl', 'Paper', 'Clear']}            value={singleData.material ?? 'Vinyl'}    onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.shape')}    options={['Rectangle', 'Circle', 'Custom']}      value={singleData.shape ?? 'Rectangle'}   onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.finish')}   options={['Glossy', 'Matte']}                    value={singleData.finish ?? 'Glossy'}     onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'poster' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('ownerPlaceOrder:shared.specs.poster')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('ownerPlaceOrder:shared.fields.size')}        options={['A3', 'A2', 'A1', 'A0']}          value={singleData.size ?? 'A3'}           onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.paperWeight')} options={['150g', '200g', '300g']}           value={singleData.weight ?? '200g'}       onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.finish')}      options={['Matte', 'Glossy']}                value={singleData.finish ?? 'Matte'}      onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label={t('ownerPlaceOrder:shared.fields.printType')}   options={['Front', 'Front & Back']}          value={singleData.printType ?? 'Front'}   onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {singleType && (
                <div className="box">
                  <h3 className="notes-heading">{t('ownerPlaceOrder:notes.title')}</h3>
                  <textarea className="input textarea" rows={3} placeholder={t('ownerPlaceOrder:notes.placeholder')} value={notes} onChange={e => setNotes(e.target.value)} />
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
                onSubmit={() => { if (!submitting) handleSingleSubmit(singleType, singleData, selectedDoc, localPreviewFile, selectedClient.name); }}
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

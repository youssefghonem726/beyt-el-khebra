import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { PdfPreviewPanel } from '../../components/PdfPreviewPanel';
// Direct service imports – bypasses VITE_USE_MOCK
import { createOrder } from '../../lib/api/ordersQuotesService';
import { createUpload, getUploads, updateUpload } from '../../lib/api/uploadsService';

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
  reorderCount?: number;
  ownerType: 'client' | 'template' | 'order';
  ownerId: string;
  url?: string;
}

// English labels kept intentionally — these values go to the backend via buildOrderItemPayload
const ITEM_TYPES: { id: ItemType; icon: string; labelEn: string }[] = [
  { id: 'book',    labelEn: 'Book',          icon: '📚' },
  { id: 'booklet', labelEn: 'Booklet',       icon: '📖' },
  { id: 'card',    labelEn: 'Business Card', icon: '🃏' },
  { id: 'sticker', labelEn: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  labelEn: 'Poster',        icon: '🖼️' },
];

const getItemLabelEn = (type: string): string =>
  ITEM_TYPES.find(t => t.id === type)?.labelEn ?? type;

const ITEM_DEFAULTS: Record<ItemType, Record<string, string>> = {
  book: {
    size: 'A4',
    colors: 'Color',
    coverFinish: 'Matte',
    casing: 'Softcover',
    printType: 'Front & Back',
  },
  booklet: {
    size: 'A4',
    weight: '150g',
    colors: 'Color',
    casing: 'Staple',
    printType: 'Front & Back',
  },
  card: {
    size: '6x9 cm',
    weight: '300g',
    finish: 'Matte',
    printType: 'Front & Back',
  },
  sticker: {
    material: 'Vinyl',
    shape: 'Rectangle',
    finish: 'Glossy',
  },
  poster: {
    size: 'A3',
    weight: '200g',
    finish: 'Matte',
    printType: 'Front',
  },
};

const cleanValue = (value: unknown) =>
  value === undefined || value === null || value === '' ? null : value;

const cleanText = (value: unknown): string | null => {
  const cleaned = cleanValue(value);
  return cleaned === null ? null : String(cleaned);
};

const toPositiveNumber = (value: unknown, fallback = 1) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
};

// Note: Fixed `getItemLabel` → `getItemLabelEn` for proper item_type
const buildOrderItemPayload = (
  itemType: ItemType,
  data: Record<string, any>,
  extraNotes = '',
  fileId: number | null = null,
  coverFileId: number | null = null
) => {
  const dataWithDefaults = { ...ITEM_DEFAULTS[itemType], ...data };

  return {
    item_type: getItemLabelEn(itemType),  // <- fixed
    quantity: toPositiveNumber(dataWithDefaults.qty),
    notes: extraNotes.trim() || cleanText(dataWithDefaults.notes),
    page_count: cleanText(dataWithDefaults.pageCount),
    size: cleanText(dataWithDefaults.size),
    paper: cleanText(dataWithDefaults.weight),
    material: cleanText(dataWithDefaults.material),
    color_mode: cleanText(dataWithDefaults.colors),
    cover: cleanText(dataWithDefaults.coverFinish),
    binding: cleanText(dataWithDefaults.casing),
    finish: cleanText(dataWithDefaults.finish),
    shape: cleanText(dataWithDefaults.shape),
    print_type: cleanText(dataWithDefaults.printType),
    file_id: fileId,
    cover_file_id: coverFileId,
  };
};

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
  const { t } = useTranslation('placeNewOrder');
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (libraryDoc && !value && !showPicker) {
    return (
      <div className="field mb-4">
        <label className="field-label">{label}</label>
        <div className="file-field__libraryItem">
          <div className="file-field__libraryBadge" style={{ background: docTypeColor(libraryDoc.type) }}>
            {libraryDoc.type}
          </div>
          <div className="file-field__libraryInfo">
            <div className="file-field__libraryName">{libraryDoc.name}</div>
            <div className="file-field__libraryFileName">{libraryDoc.fileName}</div>
          </div>
          <button className="btn btn--xs" onClick={() => { setShowPicker(true); onClearLibrary?.(); }}>
            {t('fileField.change')}
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
      <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>
        {t('fileField.browse')}
      </button>
      {value && <p className="file-field__selected">{t('fileField.selected', { name: value.name })}</p>}
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
  const { t } = useTranslation('placeNewOrder');
  const d = item.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const typeInfo = ITEM_TYPES.find(t => t.id === item.type)!;

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
      <div className="item-editor__header">
        <div className="item-editor__typeInfo">
          <span className="item-editor__icon">{typeInfo.icon}</span>
          <span className="item-editor__label">{t(`itemTypes.${typeInfo.id}`)}</span>
        </div>
        <button className="btn btn-sm" onClick={onRemove}>{t('itemEditor.remove')}</button>
      </div>

      <p className="spec-section-label">{t('itemEditor.fileAndQty')}</p>
      <FileField label={t('itemEditor.printFile')} value={d.pdf ?? null} onChange={f => set('pdf', f)} libraryDoc={libraryDoc} onClearLibrary={onClearLibraryDoc} />
      <div className="field mb-4">
        <label className="field-label">{t('itemEditor.quantity')}</label>
        <input className="input" type="number" min={1} placeholder={t('itemEditor.qtyPlaceholder')} value={d.qty ?? ''} onChange={e => set('qty', e.target.value)} />
      </div>
      <div className="field mb-4">
        <label className="field-label">Page Count</label>
        <input className="input" type="number" min={1} placeholder="If applicable" value={d.pageCount ?? ''} onChange={e => set('pageCount', e.target.value)} />
      </div>

      {item.type === 'book' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{t('itemEditor.specs.book')}</p>
          <FileField label={t('fields.coverFile')} value={d.cover ?? null} onChange={f => set('cover', f)} />
          {coverPreviewDoc && <PdfPreviewPanel doc={coverPreviewDoc} height={200} />}
          <div className="form-grid-2 mt-1">
            <SelectField label={t('fields.coverFinish')} options={['Matte', 'Shiny', 'Transparent']} value={d.coverFinish ?? 'Matte'} onChange={v => set('coverFinish', v)} />
            <SelectField label={t('fields.colors')} options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
            <SelectField label={t('fields.size')} options={['A4', 'A5']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
            <SelectField label={t('fields.printType')} options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label={t('fields.binding')} options={['Softcover', 'Hardcover', 'Spiral']} value={d.casing ?? 'Softcover'} onChange={v => set('casing', v)} />
          </div>
        </>
      )}
      {item.type === 'booklet' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{t('itemEditor.specs.booklet')}</p>
          <div className="form-grid-2">
            <SelectField label={t('fields.paperWeight')} options={['150g', '200g', '300g']} value={d.weight ?? '150g'} onChange={v => set('weight', v)} />
            <SelectField label={t('fields.size')} options={['A4', 'A3 (Centerfold)']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
            <SelectField label={t('fields.colors')} options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
            <SelectField label={t('fields.printType')} options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label={t('fields.binding')} options={['Staple', 'Glue']} value={d.casing ?? 'Staple'} onChange={v => set('casing', v)} />
          </div>
        </>
      )}
      {item.type === 'card' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{t('itemEditor.specs.card')}</p>
          <div className="form-grid-2">
            <SelectField label={t('fields.paperWeight')} options={['200g', '300g', '400g']} value={d.weight ?? '300g'} onChange={v => set('weight', v)} />
            <SelectField label={t('fields.size')} options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={d.size ?? '6×9 cm'} onChange={v => set('size', v)} />
            <SelectField label={t('fields.finish')} options={['Matte', 'Glossy', 'UV']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
            <SelectField label={t('fields.printType')} options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}
      {item.type === 'sticker' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{t('itemEditor.specs.sticker')}</p>
          <div className="form-grid-2">
            <SelectField label={t('fields.material')} options={['Vinyl', 'Paper', 'Clear']} value={d.material ?? 'Vinyl'} onChange={v => set('material', v)} />
            <SelectField label={t('fields.shape')} options={['Rectangle', 'Circle', 'Custom']} value={d.shape ?? 'Rectangle'} onChange={v => set('shape', v)} />
            <SelectField label={t('fields.finish')} options={['Glossy', 'Matte']} value={d.finish ?? 'Glossy'} onChange={v => set('finish', v)} />
          </div>
        </>
      )}
      {item.type === 'poster' && (
        <>
          <div className="line line--compact" />
          <p className="spec-section-label">{t('itemEditor.specs.poster')}</p>
          <div className="form-grid-2">
            <SelectField label={t('fields.size')} options={['A3', 'A2', 'A1', 'A0']} value={d.size ?? 'A3'} onChange={v => set('size', v)} />
            <SelectField label={t('fields.paperWeight')} options={['150g', '200g', '300g']} value={d.weight ?? '200g'} onChange={v => set('weight', v)} />
            <SelectField label={t('fields.finish')} options={['Matte', 'Glossy']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
            <SelectField label={t('fields.printType')} options={['Front', 'Front & Back']} value={d.printType ?? 'Front'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}

      {previewDoc && <PdfPreviewPanel doc={previewDoc} height={200} />}
    </div>
  );
}

// ───────────────────────────── MAIN COMPONENT ───────────────────────────────
export default function PlaceNewOrder() {
  return (
    <Suspense fallback={null}>
      <PlaceNewOrderInner />
    </Suspense>
  );
}

function PlaceNewOrderInner() {
  const { t } = useTranslation(['common', 'placeNewOrder']);
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

  // Local previews for the SINGLE order page
  const [localSingleFile, setLocalSingleFile] = useState<File | null>(null);
  const [localSingleUrl, setLocalSingleUrl] = useState<string | null>(null);
  const [localCoverFile, setLocalCoverFile] = useState<File | null>(null);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);

  // Fetch the client's uploaded files
  useEffect(() => {
    getUploads()
      .then(res => {
        const mapped: ClientDocument[] = res.data.data.map(u => ({
          id: String(u.id),
          name: u.file_name || u.url.split('/').pop() || 'File',
          fileName: u.url.split('/').pop() || 'File',
          type: (u.url.split('.').pop() ?? 'PDF').toUpperCase(),
          sizeKB: u.file_size ? Math.round(u.file_size / 1024) : 0,
          uploadedDate: '',
          reorderCount: u.reorder_count ?? 0,
          ownerType: 'client' as const,
          ownerId: String(u.owner_id || u.uploaded_by),
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

  const uploadFileIfNeeded = async (file: unknown, fileType: string): Promise<number | null> => {
    if (!(file instanceof File)) return null;
    const uploadRes = await createUpload({ file, file_type: fileType });
    return uploadRes.data.data.id;
  };

  const linkUploadedFiles = async (
    orderId: number,
    itemDetails: Array<{ id: number }>,
    payloadItems: Array<{ file_id?: number | null; cover_file_id?: number | null }>
  ) => {
    await Promise.all(payloadItems.flatMap((item, index) => {
      const orderItemId = itemDetails[index]?.id;
      const updates = [];
      if (item.file_id) {
        updates.push(updateUpload(item.file_id, { order_id: orderId, order_item_id: orderItemId || null }));
      }
      if (item.cover_file_id) {
        updates.push(updateUpload(item.cover_file_id, { order_id: orderId, order_item_id: orderItemId || null }));
      }
      return updates;
    }));
  };

  if (submitted) {
    return (
      <AppShell role="client" activePage="place-new-order">
        <Topbar title={t('placeNewOrder:title')} />
        <section className="box success-message">
          <div className="success-icon">✓</div>
          <h2>{t('placeNewOrder:success.title')}</h2>
          <p className="success-subtext">{t('placeNewOrder:success.subtext')}</p>
          <div className="flex gap-3 center">
            <button className="btn primary" onClick={() => navigateTopLevel('my-orders')}>
              {t('placeNewOrder:success.viewOrders')}
            </button>
            <button className="btn" onClick={resetAll}>
              {t('placeNewOrder:success.placeAnother')}
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="place-new-order">
      <Topbar title={t('placeNewOrder:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── Order type choice ── */}
      {!orderType && (
        <section className="order-type-picker mx-auto">
          <p className="picker-intro">{t('placeNewOrder:picker.intro')}</p>
          <div className="grid-2 gap-4">
            <div className="box picker-card" onClick={() => setOrderType('package')}>
              <h3 className="mb-2">{t('placeNewOrder:picker.package.title')}</h3>
              <p className="picker-description">{t('placeNewOrder:picker.package.description')}</p>
            </div>
            <div className="box picker-card" onClick={() => setOrderType('single')}>
              <h3 className="mb-2">{t('placeNewOrder:picker.single.title')}</h3>
              <p className="picker-description">{t('placeNewOrder:picker.single.description')}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Package order ── */}
      {orderType === 'package' && (
        <>
          <button className="global-back-btn" onClick={() => { setOrderType(null); setSelectedDocId(''); }}>
            {t('placeNewOrder:back')}
          </button>

          <section className="split panel-wrapper">
            <div className="panel-left">
              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 className="doc-library__heading">{t('placeNewOrder:library.title')}</h3>
                  <p className="doc-library__help">{t('placeNewOrder:library.helpPackage')}</p>
                  <div className="doc-list">
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div key={doc.id} onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          className={`doc-list__item ${isSelected ? 'doc-list__item--selected' : ''}`}>
                          <div className="doc-list__badge" style={{ background: docTypeColor(doc.type) }}>
                            {doc.type}
                          </div>
                          <div className="doc-list__info">
                            <div className="doc-list__name">{doc.name}</div>
                            <div className="doc-list__meta">
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {(doc.reorderCount ?? 0) > 0 && (
                                <span className="doc-list__reorder">
                                  {t('placeNewOrder:library.orderedCount', { count: doc.reorderCount })}
                                </span>
                              )}
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
                <h3 className="add-items-heading">{t('placeNewOrder:addItems.title')}</h3>
                <p className="add-items-help">{t('placeNewOrder:addItems.help')}</p>
                <div className="item-type-grid">
                  {ITEM_TYPES.map(itemType => (
                    <button key={itemType.id} onClick={() => addItem(itemType.id)} className="item-type-btn">
                      <span className="item-type-icon">{itemType.icon}</span>
                      <span className="item-type-label">{t(`placeNewOrder:itemTypes.${itemType.id}`)}</span>
                    </button>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="no-items-hint">{t('placeNewOrder:addItems.empty')}</p>
                )}
              </div>

              {/* Item editors */}
              {items.map((item, idx) => (
                <ItemEditor key={item.id} item={item} onChange={data => updateItem(item.id, data)}
                  onRemove={() => removeItem(item.id)}
                  libraryDoc={idx === 0 ? selectedDoc : null}
                  onClearLibraryDoc={() => setSelectedDocId('')} />
              ))}

              {/* Notes */}
              {items.length > 0 && (
                <div className="box">
                  <h3 className="notes-heading">{t('placeNewOrder:notes.title')}</h3>
                  <textarea className="input textarea" rows={3} placeholder={t('placeNewOrder:notes.placeholder')}
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="sticky-panel box">
              <h3 className="summary__heading">{t('placeNewOrder:summary.title')}</h3>
              <div className="summary-rows">
                {items.length === 0 ? (
                  <p className="summary__empty">{t('placeNewOrder:summary.empty')}</p>
                ) : (
                  items.map(i => {
                    const typeInfo = ITEM_TYPES.find(itemType => itemType.id === i.type)!;
                    return (
                      <div key={i.id} className="summary-row">
                        <span><span className="mr-1">{typeInfo.icon}</span>{t(`placeNewOrder:itemTypes.${typeInfo.id}`)}</span>
                        <span className="summary-row__value">
                          {i.data.qty ? t('placeNewOrder:summary.pcs', { count: Number(i.data.qty).toLocaleString() }) : '—'}
                        </span>
                      </div>
                    );
                  })
                )}
                {selectedDoc && (
                  <div className="summary-row summary-row--file">
                    <span className="summary-row__label">{t('placeNewOrder:summary.file')}</span>
                    <span className="summary-row__file-value">{selectedDoc.name}</span>
                  </div>
                )}
              </div>
              <div className="summary-footer">
                <p className="summary-footer__text">{t('placeNewOrder:summary.priceNote')}</p>
              </div>
              <button className="btn primary block" disabled={items.length === 0 || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setError(null);
                  try {
                    const totalQty = items.reduce((sum, i) => sum + (Number(i.data.qty) || 1), 0);
                    const payloadItems = await Promise.all(items.map(async (item, index) => {
                      const uploadedFileId = await uploadFileIfNeeded(item.data.pdf, 'content');
                      const uploadedCoverId = await uploadFileIfNeeded(item.data.cover, 'cover');
                      const libraryFileId = index === 0 && selectedDoc ? Number(selectedDoc.id) : null;
                      return buildOrderItemPayload(
                        item.type,
                        item.data,
                        notes,
                        uploadedFileId || libraryFileId,
                        uploadedCoverId
                      );
                    }));

                    const orderRes = await createOrder({
                      status: 'UNPRICED_PENDING',
                      quantity: totalQty || 1,
                      total_price: 0,
                      order_items: payloadItems,
                    });
                    await linkUploadedFiles(
                      orderRes.data.data.id,
                      orderRes.data.data.item_details || [],
                      payloadItems
                    );
                    setSubmitted(true);
                  } catch {
                    setError(t('placeNewOrder:errors.submitFailed'));
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                {submitting ? t('placeNewOrder:submit.submitting') : t('placeNewOrder:submit.package')}
              </button>
            </aside>
          </section>
        </>
      )}

      {/* ── Single order ── */}
      {orderType === 'single' && (
        <>
          <button className="global-back-btn" onClick={() => { setOrderType(null); setSingleType(''); setSingleData({}); setSelectedDocId(''); }}>
            {t('placeNewOrder:back')}
          </button>

          <section className="split panel-wrapper">
            <div className="panel-left">
              {/* Document library */}
              {docs.length > 0 && (
                <div className="box">
                  <h3 className="doc-library__heading">{t('placeNewOrder:library.title')}</h3>
                  <p className="doc-library__help">{t('placeNewOrder:library.helpSingle')}</p>
                  <div className="doc-list">
                    {docs.map(doc => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <div key={doc.id} onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                          className={`doc-list__item ${isSelected ? 'doc-list__item--selected' : ''}`}>
                          <div className="doc-list__badge" style={{ background: docTypeColor(doc.type) }}>
                            {doc.type}
                          </div>
                          <div className="doc-list__info">
                            <div className="doc-list__name">{doc.name}</div>
                            <div className="doc-list__meta">
                              {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                              {(doc.reorderCount ?? 0) > 0 && (
                                <span className="doc-list__reorder">
                                  {t('placeNewOrder:library.orderedCount', { count: doc.reorderCount })}
                                </span>
                              )}
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
                <h3 className="single-type-heading">{t('placeNewOrder:singleType.title')}</h3>
                <p className="single-type-help">{t('placeNewOrder:singleType.help')}</p>

                <div className="item-type-grid single-type-grid">
                  {ITEM_TYPES.map(itemType => {
                    const active = singleType === itemType.id;
                    return (
                      <button key={itemType.id} onClick={() => { setSingleType(itemType.id as ItemType); setSingleData({}); }}
                        className={`item-type-btn ${active ? 'item-type-btn--active' : ''}`}>
                        <span className="item-type-icon">{itemType.icon}</span>
                        <span className="item-type-label">{t(`placeNewOrder:itemTypes.${itemType.id}`)}</span>
                      </button>
                    );
                  })}
                </div>

                {singleType && (
                  <>
                    <div className="line line--compact" />
                    <p className="spec-section-label">{t('placeNewOrder:itemEditor.fileAndQty')}</p>
                    <FileField label={t('placeNewOrder:itemEditor.printFile')} value={singleData.pdf ?? null}
                      onChange={f => setSingleData(d => ({ ...d, pdf: f }))}
                      libraryDoc={selectedDoc}
                      onClearLibrary={() => setSelectedDocId('')}
                      onFilePreview={handleSingleFilePreview} />
                    <div className="field mb-4">
                      <label className="field-label">{t('placeNewOrder:itemEditor.quantity')}</label>
                      <input className="input" type="number" min={1} placeholder={t('placeNewOrder:itemEditor.qtyPlaceholderSingle')}
                        value={singleData.qty ?? ''} onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))} />
                    </div>
                    <div className="field mb-4">
                      <label className="field-label">Page Count</label>
                      <input className="input" type="number" min={1} placeholder="If applicable"
                        value={singleData.pageCount ?? ''} onChange={e => setSingleData(d => ({ ...d, pageCount: e.target.value }))} />
                    </div>

                    {singleType === 'book' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('placeNewOrder:itemEditor.specs.book')}</p>
                        <FileField label={t('placeNewOrder:fields.coverFile')} value={singleData.cover ?? null}
                          onChange={f => setSingleData(d => ({ ...d, cover: f }))}
                          onFilePreview={handleCoverFilePreview} />
                        {localCoverFile && (
                          <PdfPreviewPanel doc={{
                            id: 'single-cover', name: localCoverFile.name, fileName: localCoverFile.name,
                            type: (localCoverFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
                            sizeKB: Math.round(localCoverFile.size / 1024),
                            uploadedDate: new Date().toLocaleDateString(),
                            url: localCoverUrl!, reorderCount: 0,
                          }} height={200} />
                        )}
                        <div className="form-grid-2 mt-1">
                          <SelectField label={t('placeNewOrder:fields.coverFinish')} options={['Matte', 'Shiny', 'Transparent']} value={singleData.coverFinish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, coverFinish: v }))} />
                          <SelectField label={t('placeNewOrder:fields.colors')} options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label={t('placeNewOrder:fields.size')} options={['A4', 'A5']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('placeNewOrder:fields.printType')} options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label={t('placeNewOrder:fields.binding')} options={['Softcover', 'Hardcover', 'Spiral']} value={singleData.casing ?? 'Softcover'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'booklet' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('placeNewOrder:itemEditor.specs.booklet')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('placeNewOrder:fields.paperWeight')} options={['150g', '200g', '300g']} value={singleData.weight ?? '150g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('placeNewOrder:fields.size')} options={['A4', 'A3 (Centerfold)']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('placeNewOrder:fields.colors')} options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                          <SelectField label={t('placeNewOrder:fields.printType')} options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                          <SelectField label={t('placeNewOrder:fields.binding')} options={['Staple', 'Glue']} value={singleData.casing ?? 'Staple'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'card' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('placeNewOrder:itemEditor.specs.card')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('placeNewOrder:fields.paperWeight')} options={['200g', '300g', '400g']} value={singleData.weight ?? '300g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('placeNewOrder:fields.size')} options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={singleData.size ?? '6×9 cm'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('placeNewOrder:fields.finish')} options={['Matte', 'Glossy', 'UV']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label={t('placeNewOrder:fields.printType')} options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'sticker' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('placeNewOrder:itemEditor.specs.sticker')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('placeNewOrder:fields.material')} options={['Vinyl', 'Paper', 'Clear']} value={singleData.material ?? 'Vinyl'} onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                          <SelectField label={t('placeNewOrder:fields.shape')} options={['Rectangle', 'Circle', 'Custom']} value={singleData.shape ?? 'Rectangle'} onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                          <SelectField label={t('placeNewOrder:fields.finish')} options={['Glossy', 'Matte']} value={singleData.finish ?? 'Glossy'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                        </div>
                      </>
                    )}
                    {singleType === 'poster' && (
                      <>
                        <div className="line line--compact" />
                        <p className="spec-section-label">{t('placeNewOrder:itemEditor.specs.poster')}</p>
                        <div className="form-grid-2">
                          <SelectField label={t('placeNewOrder:fields.size')} options={['A3', 'A2', 'A1', 'A0']} value={singleData.size ?? 'A3'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                          <SelectField label={t('placeNewOrder:fields.paperWeight')} options={['150g', '200g', '300g']} value={singleData.weight ?? '200g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                          <SelectField label={t('placeNewOrder:fields.finish')} options={['Matte', 'Glossy']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                          <SelectField label={t('placeNewOrder:fields.printType')} options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                        </div>
                      </>
                    )}

                    {localSingleFile && (
                      <PdfPreviewPanel doc={{
                        id: 'single-main', name: localSingleFile.name, fileName: localSingleFile.name,
                        type: (localSingleFile.name.split('.').pop() ?? 'PDF').toUpperCase(),
                        sizeKB: Math.round(localSingleFile.size / 1024),
                        uploadedDate: new Date().toLocaleDateString(),
                        url: localSingleUrl!, reorderCount: 0,
                      }} height={200} />
                    )}
                  </>
                )}
              </div>

              {singleType && (
                <div className="box">
                  <h3 className="notes-heading">{t('placeNewOrder:notes.title')}</h3>
                  <textarea className="input textarea" rows={3} placeholder={t('placeNewOrder:notes.placeholder')}
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="sticky-panel box">
              <h3 className="summary__heading">{t('placeNewOrder:summary.title')}</h3>
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="summary-row__label">{t('placeNewOrder:summary.type')}</span>
                  {singleType ? (
                    <span className="summary-badge">
                      {ITEM_TYPES.find(itemType => itemType.id === singleType)?.icon}&nbsp;
                      {t(`placeNewOrder:itemTypes.${singleType}`)}
                    </span>
                  ) : <span className="muted">—</span>}
                </div>
                <div className="summary-row summary-row--file">
                  <span className="summary-row__label">{t('placeNewOrder:summary.file')}</span>
                  <span className="summary-row__file-value">
                    {selectedDoc ? selectedDoc.name : localSingleFile ? localSingleFile.name : '—'}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">{t('placeNewOrder:summary.quantity')}</span>
                  <span className="summary-row__value">
                    {singleData.qty ? t('placeNewOrder:summary.pcs', { count: Number(singleData.qty).toLocaleString() }) : '—'}
                  </span>
                </div>
              </div>
              <div className="summary-footer">
                <p className="summary-footer__text">{t('placeNewOrder:summary.priceNote')}</p>
              </div>
              <button className="btn primary block" disabled={!singleType || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setError(null);
                  try {
                    const uploadedFileId = await uploadFileIfNeeded(singleData.pdf, 'content');
                    const uploadedCoverId = await uploadFileIfNeeded(singleData.cover, 'cover');
                    const libraryFileId = selectedDoc ? Number(selectedDoc.id) : null;
                    const qty = Number(singleData.qty) || 1;
                    const payloadItems = [
                      buildOrderItemPayload(
                        singleType as ItemType,
                        singleData,
                        notes,
                        uploadedFileId || libraryFileId,
                        uploadedCoverId
                      ),
                    ];
                    const orderRes = await createOrder({
                      status: 'UNPRICED_PENDING',
                      quantity: qty,
                      total_price: 0,
                      order_items: payloadItems,
                    });
                    await linkUploadedFiles(
                      orderRes.data.data.id,
                      orderRes.data.data.item_details || [],
                      payloadItems
                    );
                    setSubmitted(true);
                  } catch {
                    setError(t('placeNewOrder:errors.submitFailed'));
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                {submitting ? t('placeNewOrder:submit.submitting') : t('placeNewOrder:submit.single')}
              </button>
            </aside>
          </section>
        </>
      )}
    </AppShell>
  );
}
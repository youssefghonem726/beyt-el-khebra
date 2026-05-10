import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

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
  url?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];

const SPEC_LABEL: Record<string, string> = {
  book: 'Book Specifications', booklet: 'Booklet Specifications',
  card: 'Card Specifications', sticker: 'Sticker Specifications', poster: 'Poster Specifications',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileTypeColor(type: string): string {
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

// ─── Shared sub-components ────────────────────────────────────────────────────

function SelectField({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FileField({ label, value, onChange, libraryDoc, onClearLibrary, onFilePreview }: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  libraryDoc?: ClientDocument | null;
  onClearLibrary?: () => void;
  onFilePreview?: (file: File | null) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If a library document is assigned and no local file is being uploaded, show the library card
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
            background: fileTypeColor(libraryDoc.type),
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

  // Default state: a styled button that opens the file dialog
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>

      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={e => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
          onFilePreview?.(file);          // <-- tell the parent to show preview
        }}
        style={{ display: 'none' }}
      />

      {/* Visible Browse button */}
      <button
        className="btn"
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        📁 Browse...
      </button>

      {value && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
          <span>Selected: {value.name}</span>
          <button
            onClick={() => { onChange(null); onFilePreview?.(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
            title="Remove file"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PDF Preview Panel ────────────────────────────────────────────────────────

function PdfPreviewPanel({ doc, height = 360 }: { doc: ClientDocument; height?: number }) {
  const [zoom, setZoom] = useState(100);
  const previewUrl = doc.url ?? `/uploads/${doc.fileName}`;
  const isPreviewable = ['PDF', 'PNG', 'JPG'].includes(doc.type.toUpperCase());

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-soft)', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0, background: fileTypeColor(doc.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>{doc.type}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 34, textAlign: 'center' }}>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <a href={previewUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4, width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↗</a>
        </div>
      </div>

      <div style={{ height, overflow: 'hidden', background: '#525659', display: 'flex', flexDirection: 'column' }}>
        {isPreviewable ? (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12px 8px' }}>
            {doc.type.toUpperCase() === 'PDF' ? (
              <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`} style={{ width: `${zoom}%`, minWidth: '100%', height: height - 40, border: 'none', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.4)', background: '#fff', display: 'block' }} title={`Preview: ${doc.name}`} />
            ) : (
              <img src={previewUrl} alt={doc.name} style={{ maxWidth: `${zoom}%`, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.4)', display: 'block' }} />
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: fileTypeColor(doc.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{doc.type}</div>
            <p style={{ fontSize: 13, margin: 0 }}>Preview not available for {doc.type} files</p>
            <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>Open file ↗</a>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>{doc.fileName}</span>
        <span>{fmtSize(doc.sizeKB)} · {doc.uploadedDate}</span>
      </div>
    </div>
  );
}

// ─── Item editor ──────────────────────────────────────────────────────────────

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

  // ── Local file preview for main PDF inside this item ──
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localFileForPreview, setLocalFileForPreview] = useState<File | null>(null);

  useEffect(() => {
    const file = d.pdf;
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);
      setLocalFileForPreview(file);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLocalPreviewUrl(null);
      setLocalFileForPreview(null);
    }
  }, [d.pdf]);

  // ── Local file preview for COVER file (only for books) ──
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl] = useState<string | null>(null);
  const [localCoverFileForPreview, setLocalCoverFileForPreview] = useState<File | null>(null);

  useEffect(() => {
    const coverFile = d.cover;
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setLocalCoverPreviewUrl(url);
      setLocalCoverFileForPreview(coverFile);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLocalCoverPreviewUrl(null);
      setLocalCoverFileForPreview(null);
    }
  }, [d.cover]);

  const previewDoc: ClientDocument | null = localFileForPreview
    ? {
        id: item.id,
        name: localFileForPreview.name,
        fileName: localFileForPreview.name,
        type: (localFileForPreview.name.split('.').pop() ?? 'PDF').toUpperCase(),
        sizeKB: Math.round(localFileForPreview.size / 1024),
        uploadedDate: new Date().toLocaleDateString(),
        url: localPreviewUrl!,
      }
    : libraryDoc || null;

  const coverPreviewDoc: ClientDocument | null = localCoverFileForPreview
    ? {
        id: `${item.id}-cover`,
        name: localCoverFileForPreview.name,
        fileName: localCoverFileForPreview.name,
        type: (localCoverFileForPreview.name.split('.').pop() ?? 'PDF').toUpperCase(),
        sizeKB: Math.round(localCoverFileForPreview.size / 1024),
        uploadedDate: new Date().toLocaleDateString(),
        url: localCoverPreviewUrl!,
      }
    : null;

  return (
    <div className="box">
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

      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>File & Quantity</p>
      <FileField label="Print File (PDF)" value={d.pdf ?? null} onChange={f => set('pdf', f)} libraryDoc={libraryDoc} onClearLibrary={onClearLibraryDoc} />
      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Quantity</label>
        <input className="input" type="number" min={1} placeholder="e.g. 100" value={d.qty ?? ''} onChange={e => set('qty', e.target.value)} />
      </div>

      {item.type === 'book' && (<>
        <div className="line" style={{ margin: '0 0 16px' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.book}</p>
        <FileField label="Cover File" value={d.cover ?? null} onChange={f => set('cover', f)} />
        {coverPreviewDoc && <PdfPreviewPanel doc={coverPreviewDoc} height={200} />}
        <div className="form-grid-2" style={{ marginTop: 4 }}>
          <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={d.coverFinish ?? 'Matte'} onChange={v => set('coverFinish', v)} />
          <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
          <SelectField label="Size" options={['A4', 'A5']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
          <SelectField label="Binding" options={['Softcover', 'Hardcover', 'Spiral']} value={d.casing ?? 'Softcover'} onChange={v => set('casing', v)} />
        </div>
      </>)}
      {item.type === 'booklet' && (<>
        <div className="line" style={{ margin: '0 0 16px' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.booklet}</p>
        <div className="form-grid-2">
          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '150g'} onChange={v => set('weight', v)} />
          <SelectField label="Size" options={['A4', 'A3 (Centerfold)']} value={d.size ?? 'A4'} onChange={v => set('size', v)} />
          <SelectField label="Colors" options={['B&W', 'Colors']} value={d.colors ?? 'Colors'} onChange={v => set('colors', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
          <SelectField label="Binding" options={['Staple', 'Glue']} value={d.casing ?? 'Staple'} onChange={v => set('casing', v)} />
        </div>
      </>)}
      {item.type === 'card' && (<>
        <div className="line" style={{ margin: '0 0 16px' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.card}</p>
        <div className="form-grid-2">
          <SelectField label="Paper Weight" options={['200g', '300g', '400g']} value={d.weight ?? '300g'} onChange={v => set('weight', v)} />
          <SelectField label="Size" options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={d.size ?? '6×9 cm'} onChange={v => set('size', v)} />
          <SelectField label="Finish" options={['Matte', 'Glossy', 'UV']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
        </div>
      </>)}
      {item.type === 'sticker' && (<>
        <div className="line" style={{ margin: '0 0 16px' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.sticker}</p>
        <div className="form-grid-2">
          <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={d.material ?? 'Vinyl'} onChange={v => set('material', v)} />
          <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={d.shape ?? 'Rectangle'} onChange={v => set('shape', v)} />
          <SelectField label="Finish" options={['Glossy', 'Matte']} value={d.finish ?? 'Glossy'} onChange={v => set('finish', v)} />
        </div>
      </>)}
      {item.type === 'poster' && (<>
        <div className="line" style={{ margin: '0 0 16px' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>{SPEC_LABEL.poster}</p>
        <div className="form-grid-2">
          <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={d.size ?? 'A3'} onChange={v => set('size', v)} />
          <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={d.weight ?? '200g'} onChange={v => set('weight', v)} />
          <SelectField label="Finish" options={['Matte', 'Glossy']} value={d.finish ?? 'Matte'} onChange={v => set('finish', v)} />
          <SelectField label="Print Type" options={['Front', 'Front & Back']} value={d.printType ?? 'Front'} onChange={v => set('printType', v)} />
        </div>
      </>)}

      {/* ── Item-level preview for main PDF ── */}
      {previewDoc && (
        <PdfPreviewPanel doc={previewDoc} height={200} />
      )}
    </div>
  );
}

// ─── Doc library list (reused in both package + single) ───────────────────────

function DocLibrary({ docs, selectedDocId, onSelect }: {
  docs: ClientDocument[];
  selectedDocId: string;
  onSelect: (id: string) => void;
}) {
  if (docs.length === 0) return null;
  return (
    <div className="box">
      <h3 style={{ marginBottom: 4 }}>Use a file from this client's library</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        Select a saved file to use as the print file, or upload a new one below.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {docs.map(doc => {
          const isSelected = doc.id === selectedDocId;
          return (
            <div
              key={doc.id}
              onClick={() => onSelect(isSelected ? '' : doc.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                background: isSelected ? 'var(--primary-soft)' : 'var(--surface-soft)',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 6, flexShrink: 0, background: fileTypeColor(doc.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{doc.type}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                  {(doc.reorderCount ?? 0) > 0 && <span style={{ marginLeft: 6, color: 'var(--primary)' }}>Ordered {doc.reorderCount}×</span>}
                </div>
              </div>
              {isSelected && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  // Global local‑file preview for SINGLE order main PDF
  const [localPreviewFile, setLocalPreviewFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Global local‑file preview for SINGLE order COVER file (book only)
  const [localCoverPreviewFile, setLocalCoverPreviewFile] = useState<File | null>(null);
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl] = useState<string | null>(null);

  const handleLocalFilePreview = useCallback((file: File | null) => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
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
    if (localCoverPreviewUrl) {
      URL.revokeObjectURL(localCoverPreviewUrl);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalCoverPreviewUrl(url);
      setLocalCoverPreviewFile(file);
    } else {
      setLocalCoverPreviewUrl(null);
      setLocalCoverPreviewFile(null);
    }
  }, [localCoverPreviewUrl]);

  // Cleanup object URLs on unmount
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
    // Clear single global previews
    setLocalPreviewFile(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    setLocalCoverPreviewFile(null);
    if (localCoverPreviewUrl) {
      URL.revokeObjectURL(localCoverPreviewUrl);
      setLocalCoverPreviewUrl(null);
    }
  }

  function resetAll() {
    setSelectedClient('');
    resetOrder();
    setSubmitted(false);
  }

  const addItem    = (type: ItemType) => setItems(p => [...p, { id: crypto.randomUUID(), type, data: {} }]);
  const updateItem = (id: string, data: Record<string, any>) => setItems(p => p.map(i => i.id === id ? { ...i, data } : i));
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  // ── Submitted ──
  if (submitted) {
    return (
      <AppShell role="owner" activePage="owner-place-order">
        <Topbar title="Place Order" />
        <section className="box" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--primary)' }}>✓</div>
          <h2 style={{ marginBottom: 8 }}>Order Placed!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 14 }}>
            Assigned to <strong>{selectedClient}</strong>
          </p>
          <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
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

      {/* ── Client selector — always visible ── */}
      <section className="box" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Select Client</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Client</label>
            <input
              className="input"
              type="text"
              list="owner-clients-list"
              placeholder="Type or search for a client…"
              value={selectedClient}
              onChange={e => { setSelectedClient(e.target.value); resetOrder(); }}
              style={{ width: '100%' }}
              autoComplete="off"
            />
            <datalist id="owner-clients-list">
              {clients.map(c => <option key={c.name} value={c.name} />)}
            </datalist>
            {selectedClient && !chosenClient && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                New client — no existing record found.
              </p>
            )}
          </div>
          {chosenClient && (
            <div style={{ padding: '10px 14px', background: 'var(--primary-soft)', borderRadius: 8, fontSize: 13, display: 'grid', gap: 3, minWidth: 200 }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{chosenClient.name}</span>
              <span style={{ color: 'var(--muted)' }}>{chosenClient.email}</span>
              <span style={{ color: 'var(--muted)' }}>{chosenClient.phone}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Order type picker — shown once a client is typed ── */}
      {!!selectedClient && !orderType && (
        <section style={{ maxWidth: 700 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 13 }}>
            Choose how you'd like to place this order for <strong>{selectedClient}</strong>.
          </p>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="box" style={{ cursor: 'pointer' }} onClick={() => setOrderType('package')}>
              <h3 style={{ marginBottom: 8 }}>Package Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Combine multiple print items (books, cards, posters…) into one order.</p>
            </div>
            <div className="box" style={{ cursor: 'pointer' }} onClick={() => setOrderType('single')}>
              <h3 style={{ marginBottom: 8 }}>Individual Order</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Order a single print item with full customization options.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Package order ── */}
      {orderType === 'package' && (
        <>
          <button className="global-back-btn" style={{ marginBottom: 16 }} onClick={resetOrder}>← Back</button>

          <section className="split" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gap: 16 }}>

              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              <div className="box">
                <h3 style={{ marginBottom: 4 }}>Add Items to Your Package</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Click a product type to add it to the order.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {ITEM_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => addItem(t.id)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 10, cursor: 'pointer', border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontWeight: 500, fontSize: 12, transition: 'all .15s' }}
                      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--primary)'; b.style.background = 'var(--primary-soft)'; b.style.color = 'var(--primary-dark)'; }}
                      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border)'; b.style.background = 'var(--surface)'; b.style.color = 'var(--muted)'; }}
                    >
                      <span style={{ fontSize: 24 }}>{t.icon}</span>
                      <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
                {items.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16, fontStyle: 'italic' }}>No items added yet.</p>
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
                  <h3 style={{ marginBottom: 10 }}>Additional Notes</h3>
                  <textarea className="input" rows={3} placeholder="Special instructions, finishing details…" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
                </div>
              )}
            </div>

            <aside style={{ position: 'sticky', top: 18, alignSelf: 'flex-start' }}>
              <div className="box">
                <h3 style={{ marginBottom: 16 }}>Order Summary</h3>
                <div style={{ display: 'grid', gap: 10, fontSize: 13, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Client</span>
                    <span style={{ fontWeight: 600 }}>{selectedClient}</span>
                  </div>
                  {items.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>No items added yet.</p>
                  ) : items.map(i => {
                    const ti = ITEM_TYPES.find(t => t.id === i.type)!;
                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span><span style={{ marginRight: 5 }}>{ti.icon}</span>{ti.label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{i.data.qty ? Number(i.data.qty).toLocaleString() + ' pcs' : '—'}</span>
                      </div>
                    );
                  })}
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
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>Order will be sent to the Unpriced Queue for pricing.</p>
                </div>
                <button className="btn primary block" disabled={items.length === 0} onClick={() => setSubmitted(true)}>
                  Place Package Order
                </button>
              </div>
            </aside>
          </section>
        </>
      )}

      {/* ── Individual order ── */}
      {orderType === 'single' && (
        <>
          <button className="global-back-btn" style={{ marginBottom: 16 }} onClick={resetOrder}>← Back</button>

          <section className="split" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gap: 16 }}>

              <DocLibrary docs={clientDocs} selectedDocId={selectedDocId} onSelect={setSelectedDocId} />

              <div className="box">
                <h3 style={{ marginBottom: 4 }}>What would you like to print?</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Pick a product type to configure the order.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: singleType ? 20 : 0 }}>
                  {ITEM_TYPES.map(t => {
                    const active = singleType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSingleType(t.id as ItemType); setSingleData({}); }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary-soft)' : 'var(--surface)', color: active ? 'var(--primary-dark)' : 'var(--muted)', fontWeight: active ? 700 : 500, fontSize: 12, transition: 'all .15s', boxShadow: active ? '0 0 0 3px rgba(31,181,178,0.12)' : 'none' }}
                      >
                        <span style={{ fontSize: 24 }}>{t.icon}</span>
                        <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {singleType && (<>
                  <div className="line" style={{ margin: '0 0 16px' }} />
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>File & Quantity</p>
                  <FileField
                    label="Print File (PDF)"
                    value={singleData.pdf ?? null}
                    onChange={f => setSingleData(d => ({ ...d, pdf: f }))}
                    libraryDoc={selectedDoc}
                    onClearLibrary={() => setSelectedDocId('')}
                    onFilePreview={handleLocalFilePreview}
                  />
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Quantity</label>
                    <input className="input" type="number" min={1} placeholder="e.g. 500" value={singleData.qty ?? ''} onChange={e => setSingleData(d => ({ ...d, qty: e.target.value }))} />
                  </div>

                  {singleType === 'book' && (<>
                    <div className="line" style={{ margin: '0 0 16px' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Book Specifications</p>
                    <FileField label="Cover File" value={singleData.cover ?? null} onChange={f => setSingleData(d => ({ ...d, cover: f }))} onFilePreview={handleLocalCoverPreview} />
                    {/* Cover preview right beneath the browse button */}
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
                    <div className="form-grid-2" style={{ marginTop: 4 }}>
                      <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={singleData.coverFinish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, coverFinish: v }))} />
                      <SelectField label="Colors" options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                      <SelectField label="Size" options={['A4', 'A5']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                      <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                      <SelectField label="Binding" options={['Softcover', 'Hardcover', 'Spiral']} value={singleData.casing ?? 'Softcover'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                    </div>
                  </>)}
                  {singleType === 'booklet' && (<>
                    <div className="line" style={{ margin: '0 0 16px' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Booklet Specifications</p>
                    <div className="form-grid-2">
                      <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={singleData.weight ?? '150g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                      <SelectField label="Size" options={['A4', 'A3 (Centerfold)']} value={singleData.size ?? 'A4'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                      <SelectField label="Colors" options={['B&W', 'Colors']} value={singleData.colors ?? 'Colors'} onChange={v => setSingleData(d => ({ ...d, colors: v }))} />
                      <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                      <SelectField label="Binding" options={['Staple', 'Glue']} value={singleData.casing ?? 'Staple'} onChange={v => setSingleData(d => ({ ...d, casing: v }))} />
                    </div>
                  </>)}
                  {singleType === 'card' && (<>
                    <div className="line" style={{ margin: '0 0 16px' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Card Specifications</p>
                    <div className="form-grid-2">
                      <SelectField label="Paper Weight" options={['200g', '300g', '400g']} value={singleData.weight ?? '300g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                      <SelectField label="Size" options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={singleData.size ?? '6×9 cm'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                      <SelectField label="Finish" options={['Matte', 'Glossy', 'UV']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                      <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front & Back'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                    </div>
                  </>)}
                  {singleType === 'sticker' && (<>
                    <div className="line" style={{ margin: '0 0 16px' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Sticker Specifications</p>
                    <div className="form-grid-2">
                      <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']} value={singleData.material ?? 'Vinyl'} onChange={v => setSingleData(d => ({ ...d, material: v }))} />
                      <SelectField label="Shape" options={['Rectangle', 'Circle', 'Custom']} value={singleData.shape ?? 'Rectangle'} onChange={v => setSingleData(d => ({ ...d, shape: v }))} />
                      <SelectField label="Finish" options={['Glossy', 'Matte']} value={singleData.finish ?? 'Glossy'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                    </div>
                  </>)}
                  {singleType === 'poster' && (<>
                    <div className="line" style={{ margin: '0 0 16px' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>Poster Specifications</p>
                    <div className="form-grid-2">
                      <SelectField label="Size" options={['A3', 'A2', 'A1', 'A0']} value={singleData.size ?? 'A3'} onChange={v => setSingleData(d => ({ ...d, size: v }))} />
                      <SelectField label="Paper Weight" options={['150g', '200g', '300g']} value={singleData.weight ?? '200g'} onChange={v => setSingleData(d => ({ ...d, weight: v }))} />
                      <SelectField label="Finish" options={['Matte', 'Glossy']} value={singleData.finish ?? 'Matte'} onChange={v => setSingleData(d => ({ ...d, finish: v }))} />
                      <SelectField label="Print Type" options={['Front', 'Front & Back']} value={singleData.printType ?? 'Front'} onChange={v => setSingleData(d => ({ ...d, printType: v }))} />
                    </div>
                  </>)}
                </>)}
              </div>

              {singleType && (
                <div className="box">
                  <h3 style={{ marginBottom: 10 }}>Additional Notes</h3>
                  <textarea className="input" rows={3} placeholder="Special instructions, finishing details…" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
                </div>
              )}
            </div>

            <aside style={{ position: 'sticky', top: 18, alignSelf: 'flex-start' }}>
              <div className="box">
                <h3 style={{ marginBottom: 16 }}>Order Summary</h3>
                <div style={{ display: 'grid', gap: 12, fontSize: 13, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Client</span>
                    <span style={{ fontWeight: 600 }}>{selectedClient}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Type</span>
                    {singleType ? (
                      <span style={{ fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--primary-soft)', color: 'var(--primary-dark)', fontSize: 12 }}>
                        {ITEM_TYPES.find(t => t.id === singleType)?.icon}&nbsp;{ITEM_TYPES.find(t => t.id === singleType)?.label}
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: 'var(--muted)', flexShrink: 0 }}>File</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedDoc ? selectedDoc.name : localPreviewFile ? localPreviewFile.name : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Quantity</span>
                    <span style={{ fontWeight: 600 }}>{singleData.qty ? Number(singleData.qty).toLocaleString() + ' pcs' : '—'}</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>Order will be sent to the Unpriced Queue for pricing.</p>
                </div>
                <button className="btn primary block" disabled={!singleType} onClick={() => setSubmitted(true)}>
                  Place Order
                </button>
              </div>
              {/* Single‑order preview in sidebar (main PDF only) */}
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
                        } as ClientDocument
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
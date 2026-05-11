import { useEffect, useState } from 'react';

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

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];
// ─────────────────────────────────────────────────────────────────────

import { FileField, SelectField } from './fields';
import { PdfPreviewPanel } from './PdfPreviewPanel';
import styles from './order.module.css';

const SPEC_LABEL: Record<string, string> = {
  book:    'Book Specifications',
  booklet: 'Booklet Specifications',
  card:    'Card Specifications',
  sticker: 'Sticker Specifications',
  poster:  'Poster Specifications',
};

interface ItemEditorProps {
  item: PackageItem;
  onChange: (d: Record<string, any>) => void;
  onRemove: () => void;
  libraryDoc?: ClientDocument | null;
  onClearLibraryDoc?: () => void;
}

export function ItemEditor({
  item,
  onChange,
  onRemove,
  libraryDoc,
  onClearLibraryDoc,
}: ItemEditorProps) {
  const d = item.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const typeInfo = ITEM_TYPES.find(t => t.id === item.type)!;

  // Main PDF preview
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localFileForPreview, setLocalFileForPreview] = useState<File | null>(null);

  useEffect(() => {
    const file = d.pdf;
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);
      setLocalFileForPreview(file);
      return () => URL.revokeObjectURL(url);
    }
    setLocalPreviewUrl(null);
    setLocalFileForPreview(null);
  }, [d.pdf]);

  // Cover PDF preview
  const [localCoverPreviewUrl, setLocalCoverPreviewUrl] = useState<string | null>(null);
  const [localCoverFileForPreview, setLocalCoverFileForPreview] = useState<File | null>(null);

  useEffect(() => {
    const coverFile = d.cover;
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setLocalCoverPreviewUrl(url);
      setLocalCoverFileForPreview(coverFile);
      return () => URL.revokeObjectURL(url);
    }
    setLocalCoverPreviewUrl(null);
    setLocalCoverFileForPreview(null);
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
    : libraryDoc ?? null;

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
      <div className={styles.itemEditor__header}>
        <div className={styles.itemEditor__typeInfo}>
          <span className={styles.itemEditor__icon}>{typeInfo.icon}</span>
          <span className={styles.itemEditor__label}>{typeInfo.label}</span>
        </div>
        <button className="btn btn-sm" onClick={onRemove}>Remove</button>
      </div>

      <p className={styles.itemEditor__sectionTitle}>File & Quantity</p>
      <FileField
        label="Print File (PDF)"
        value={d.pdf ?? null}
        onChange={f => set('pdf', f)}
        libraryDoc={libraryDoc}
        onClearLibrary={onClearLibraryDoc}
      />
      <div className="field mb-4">
        <label className="field-label">Quantity</label>
        <input
          className="input"
          type="number"
          min={1}
          placeholder="e.g. 100"
          value={d.qty ?? ''}
          onChange={e => set('qty', e.target.value)}
        />
      </div>

      {/* ── Book specs ── */}
      {item.type === 'book' && (
        <>
          <div className="line line--compact" />
          <p className={styles.itemEditor__sectionTitle}>{SPEC_LABEL.book}</p>
          <FileField label="Cover File" value={d.cover ?? null} onChange={f => set('cover', f)} />
          {coverPreviewDoc && <PdfPreviewPanel doc={coverPreviewDoc} height={200} />}
          <div className="form-grid-2 mt-1">
            <SelectField label="Cover Finish" options={['Matte', 'Shiny', 'Transparent']} value={d.coverFinish ?? 'Matte'} onChange={v => set('coverFinish', v)} />
            <SelectField label="Colors"       options={['B&W', 'Colors']}                 value={d.colors ?? 'Colors'}      onChange={v => set('colors', v)} />
            <SelectField label="Size"         options={['A4', 'A5']}                       value={d.size ?? 'A4'}            onChange={v => set('size', v)} />
            <SelectField label="Print Type"   options={['Front', 'Front & Back']}          value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label="Binding"      options={['Softcover', 'Hardcover', 'Spiral']} value={d.casing ?? 'Softcover'} onChange={v => set('casing', v)} />
          </div>
        </>
      )}

      {/* ── Booklet specs ── */}
      {item.type === 'booklet' && (
        <>
          <div className="line line--compact" />
          <p className={styles.itemEditor__sectionTitle}>{SPEC_LABEL.booklet}</p>
          <div className="form-grid-2">
            <SelectField label="Paper Weight" options={['150g', '200g', '300g']}           value={d.weight ?? '150g'}        onChange={v => set('weight', v)} />
            <SelectField label="Size"         options={['A4', 'A3 (Centerfold)']}           value={d.size ?? 'A4'}            onChange={v => set('size', v)} />
            <SelectField label="Colors"       options={['B&W', 'Colors']}                   value={d.colors ?? 'Colors'}      onChange={v => set('colors', v)} />
            <SelectField label="Print Type"   options={['Front', 'Front & Back']}            value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
            <SelectField label="Binding"      options={['Staple', 'Glue']}                   value={d.casing ?? 'Staple'}     onChange={v => set('casing', v)} />
          </div>
        </>
      )}

      {/* ── Card specs ── */}
      {item.type === 'card' && (
        <>
          <div className="line line--compact" />
          <p className={styles.itemEditor__sectionTitle}>{SPEC_LABEL.card}</p>
          <div className="form-grid-2">
            <SelectField label="Paper Weight" options={['200g', '300g', '400g']}            value={d.weight ?? '300g'}        onChange={v => set('weight', v)} />
            <SelectField label="Size"         options={['6×9 cm', '3×6 cm', 'A5', 'A4 ÷ 8']} value={d.size ?? '6×9 cm'}     onChange={v => set('size', v)} />
            <SelectField label="Finish"       options={['Matte', 'Glossy', 'UV']}            value={d.finish ?? 'Matte'}      onChange={v => set('finish', v)} />
            <SelectField label="Print Type"   options={['Front', 'Front & Back']}            value={d.printType ?? 'Front & Back'} onChange={v => set('printType', v)} />
          </div>
        </>
      )}

      {/* ── Sticker specs ── */}
      {item.type === 'sticker' && (
        <>
          <div className="line line--compact" />
          <p className={styles.itemEditor__sectionTitle}>{SPEC_LABEL.sticker}</p>
          <div className="form-grid-2">
            <SelectField label="Material" options={['Vinyl', 'Paper', 'Clear']}              value={d.material ?? 'Vinyl'}    onChange={v => set('material', v)} />
            <SelectField label="Shape"    options={['Rectangle', 'Circle', 'Custom']}        value={d.shape ?? 'Rectangle'}   onChange={v => set('shape', v)} />
            <SelectField label="Finish"   options={['Glossy', 'Matte']}                      value={d.finish ?? 'Glossy'}     onChange={v => set('finish', v)} />
          </div>
        </>
      )}

      {/* ── Poster specs ── */}
      {item.type === 'poster' && (
        <>
          <div className="line line--compact" />
          <p className={styles.itemEditor__sectionTitle}>{SPEC_LABEL.poster}</p>
          <div className="form-grid-2">
            <SelectField label="Size"         options={['A3', 'A2', 'A1', 'A0']}            value={d.size ?? 'A3'}           onChange={v => set('size', v)} />
            <SelectField label="Paper Weight" options={['150g', '200g', '300g']}             value={d.weight ?? '200g'}       onChange={v => set('weight', v)} />
            <SelectField label="Finish"       options={['Matte', 'Glossy']}                  value={d.finish ?? 'Matte'}      onChange={v => set('finish', v)} />
            <SelectField label="Print Type"   options={['Front', 'Front & Back']}            value={d.printType ?? 'Front'}   onChange={v => set('printType', v)} />
          </div>
        </>
      )}

      {previewDoc && <PdfPreviewPanel doc={previewDoc} height={200} />}
    </div>
  );
}
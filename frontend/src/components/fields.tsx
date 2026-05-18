import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ── Inlined from types.ts ───────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────

import styles from './fields.module.css';

// ── SelectField ────────────────────────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export function SelectField({ label, options, value, onChange }: SelectFieldProps) {
  return (
    <div className={styles.selectField}>
      <label>{label}</label>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── FileField ──────────────────────────────────────────────────────────────────

interface FileFieldProps {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  libraryDoc?: ClientDocument | null;
  onClearLibrary?: () => void;
  onFilePreview?: (file: File | null) => void;
}

export function FileField({
  label,
  value,
  onChange,
  libraryDoc,
  onClearLibrary,
  onFilePreview,
}: FileFieldProps) {
  const { t } = useTranslation('ownerPlaceOrder');
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (libraryDoc && !value && !showPicker) {
    return (
      <div className={styles.fileField}>
        <label>{label}</label>
        <div className={styles.fileField__libraryItem}>
          <div
            className={styles.fileField__libraryBadge}
            style={{ background: fileTypeColor(libraryDoc.type) }}
          >
            {libraryDoc.type}
          </div>
          <div className={styles.fileField__libraryInfo}>
            <div className={styles.fileField__libraryName}>{libraryDoc.name}</div>
            <div className={styles.fileField__libraryFileName}>{libraryDoc.fileName}</div>
          </div>
          <button
            className="btn btn--xs"
            onClick={() => { setShowPicker(true); onClearLibrary?.(); }}
          >
            {t('shared.change')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fileField}>
      <label>{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={e => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
          onFilePreview?.(file);
        }}
        className="hidden-file-input"
      />
      <button
        className="btn"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        {t('shared.browse')}
      </button>
      {value && (
        <div className={styles.fileField__selected}>
          <span>{t('shared.selected', { name: value.name })}</span>
          <button
            className={styles.fileField__remove}
            onClick={() => { onChange(null); onFilePreview?.(null); }}
            title="Remove file"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

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

function fmtSize(kb: number): string {
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
}
// ─────────────────────────────────────────────────────────────────────

import styles from './order.module.css';

interface DocLibraryProps {
  docs: ClientDocument[];
  selectedDocId: string;
  onSelect: (id: string) => void;
}

export function DocLibrary({ docs, selectedDocId, onSelect }: DocLibraryProps) {
  if (docs.length === 0) return null;

  return (
    <div className="box">
      <h3 className="doc-library__heading">Use a file from this client's library</h3>
      <p className="doc-library__help">
        Select a saved file to use as the print file, or upload a new one below.
      </p>
      <div className={styles.docLibrary__list}>
        {docs.map(doc => {
          const isSelected = doc.id === selectedDocId;
          return (
            <div
              key={doc.id}
              onClick={() => onSelect(isSelected ? '' : doc.id)}
              className={`${styles.docLibrary__row} ${isSelected ? styles['docLibrary__row--selected'] : ''}`}
            >
              <div
                className={styles.docLibrary__badge}
                style={{ background: fileTypeColor(doc.type) }}
              >
                {doc.type}
              </div>
              <div className={styles.docLibrary__info}>
                <div className={styles.docLibrary__name}>{doc.name}</div>
                <div className={styles.docLibrary__meta}>
                  {doc.fileName}&nbsp;·&nbsp;{fmtSize(doc.sizeKB)}
                  {(doc.reorderCount ?? 0) > 0 && (
                    <span className={styles.docLibrary__reorder}>
                      Ordered {doc.reorderCount}×
                    </span>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className={styles.docLibrary__check}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
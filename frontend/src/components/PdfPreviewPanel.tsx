import { useState } from 'react';

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

import styles from './PdfPreviewPanel.module.css';

interface PdfPreviewPanelProps {
  doc: ClientDocument;
  height?: number;
}

export function PdfPreviewPanel({ doc, height = 360 }: PdfPreviewPanelProps) {
  const [zoom, setZoom] = useState(100);
  const previewUrl = doc.url ?? `/uploads/${doc.fileName}`;
  const isPreviewable = ['PDF', 'PNG', 'JPG'].includes(doc.type.toUpperCase());

  return (
    <div className={styles.preview}>
      {/* Header */}
      <div className={styles.preview__header}>
        <div className={styles.preview__headerLeft}>
          <div
            className={styles.preview__badge}
            style={{ background: fileTypeColor(doc.type) }}
          >
            {doc.type}
          </div>
          <span className={styles.preview__name}>{doc.name}</span>
        </div>
        <div className={styles.preview__controls}>
          <button
            className={styles.preview__zoomBtn}
            onClick={() => setZoom(z => Math.max(50, z - 25))}
          >
            −
          </button>
          <span className={styles.preview__zoomLabel}>{zoom}%</span>
          <button
            className={styles.preview__zoomBtn}
            onClick={() => setZoom(z => Math.min(200, z + 25))}
          >
            +
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.preview__openLink}
          >
            ↗
          </a>
        </div>
      </div>

      {/* Viewport */}
      <div className={styles.preview__viewport} style={{ height }}>
        {isPreviewable ? (
          <div className={styles.preview__scroll}>
            {doc.type.toUpperCase() === 'PDF' ? (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`}
                className={styles.preview__iframe}
                style={{
                  width: `${zoom}%`,
                  minWidth: '100%',
                  height: height - 40,
                }}
                title={`Preview: ${doc.name}`}
              />
            ) : (
              <img
                src={previewUrl}
                alt={doc.name}
                className={styles.preview__img}
                style={{ maxWidth: `${zoom}%` }}
              />
            )}
          </div>
        ) : (
          <div className={styles.preview__noPreview}>
            <div
              className={styles.preview__noPreviewBadge}
              style={{ background: fileTypeColor(doc.type) }}
            >
              {doc.type}
            </div>
            <p className={styles.preview__noPreviewText}>
              Preview not available for {doc.type} files
            </p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.preview__noPreviewLink}
            >
              Open file ↗
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.preview__footer}>
        <span>{doc.fileName}</span>
        <span>{fmtSize(doc.sizeKB)} · {doc.uploadedDate}</span>
      </div>
    </div>
  );
}
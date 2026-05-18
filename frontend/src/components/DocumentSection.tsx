import { useState, useEffect, useRef } from 'react';
// Direct import from the real service – bypasses VITE_USE_MOCK
import { getDocuments } from '../lib/api/documentsService';

// ── Local display type (unchanged) ──────────────────────────────────────────
export interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
}

interface Props {
  clientId: string;
}

// ── Config ──────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  PDF   : '#e53e3e',
  AI    : '#f97316',
  PSD   : '#2563eb',
  PNG   : '#059669',
  JPG   : '#059669',
  SVG   : '#aa3bff',
  Other : '#6b7280',
};

function formatSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

// ── DocumentSection ─────────────────────────────────────────────────────────
export default function DocumentSection({ clientId }: Props) {
  const [docs, setDocs]                       = useState<ClientDocument[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [renamingId, setRenamingId]           = useState<string | null>(null);
  const [renameValue, setRenameValue]         = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch via API ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await getDocuments({ ownerType: 'client', ownerId: clientId });
        setDocs(res.data.data);                     // ✅ fixed: now uses setDocs
      } catch (err: any) {
        // 404 → endpoint not built yet → empty list, not an error
        if (err?.response?.status === 404) {
          setDocs([]);
        } else {
          setError('Failed to load documents.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [clientId]);

  // ── Rename focus ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // ── Handlers (unchanged) ──────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    setRenamingId(null);
    setConfirmRemoveId(null);
  };

  const startRename = (doc: ClientDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameValue(doc.name);
    setConfirmRemoveId(null);
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) setDocs(ds => ds.map(d => d.id === id ? { ...d, name: trimmed } : d));
    setRenamingId(null);
  };

  const handleRenameKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') commitRename(id);
    if (e.key === 'Escape') setRenamingId(null);
  };

  const askRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmRemoveId(id);
    setRenamingId(null);
  };

  const confirmRemove = (id: string) => {
    setDocs(ds => ds.filter(d => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    setConfirmRemoveId(null);
  };

  const handleDownload = (doc: ClientDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = [
      `Name:           ${doc.name}`,
      `File:           ${doc.fileName}`,
      `Type:           ${doc.type}`,
      `Size:           ${formatSize(doc.sizeKB)}`,
      `Uploaded:       ${doc.uploadedDate}`,
      `Reorder Count:  ${doc.reorderCount}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = doc.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return <div className="loading-state" style={{ fontSize: 13, padding: '10px 0' }}>Loading documents…</div>;
  }

  if (error) {
    return <div className="error-state" style={{ fontSize: 13, padding: '10px 0' }}>{error}</div>;
  }

  if (docs.length === 0) {
    return (
      <p style={{ color: 'var(--muted, #888)', fontSize: 13, padding: '12px 0' }}>
        No documents attached to this client.
      </p>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {docs.map(doc => {
        const isExpanded   = expandedId === doc.id;
        const isRenaming   = renamingId === doc.id;
        const isConfirming = confirmRemoveId === doc.id;
        const chipColor    = TYPE_COLORS[doc.type] ?? TYPE_COLORS.Other;

        return (
          <div
            key={doc.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              transition: 'box-shadow 0.15s',
              boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
            }}
          >
            {/* ── Row header ── */}
            <div
              onClick={() => toggleExpand(doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                cursor: 'pointer',
                background: isExpanded ? 'var(--accent-bg, rgba(170,59,255,0.06))' : 'transparent',
                userSelect: 'none',
                transition: 'background 0.15s',
              }}
            >
              {/* File icon */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.55 }}>
                <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>

              {/* Name / rename input */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    className="input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(doc.id)}
                    onKeyDown={e => handleRenameKey(e, doc.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '100%', padding: '3px 8px', fontSize: 13 }}
                  />
                ) : (
                  <>
                    <span style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--text-h)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                    }}>
                      {doc.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted, #999)', display: 'block', marginTop: 1 }}>
                      {doc.fileName}
                    </span>
                  </>
                )}
              </div>

              {/* Type chip */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: chipColor + '18', color: chipColor, flexShrink: 0,
              }}>
                {doc.type}
              </span>

              {/* Size */}
              <span style={{ fontSize: 12, color: 'var(--muted, #999)', flexShrink: 0, minWidth: 56, textAlign: 'right' }}>
                {formatSize(doc.sizeKB)}
              </span>

              {/* Upload date */}
              <span style={{ fontSize: 12, color: 'var(--muted, #999)', flexShrink: 0, minWidth: 84, textAlign: 'right' }}>
                {doc.uploadedDate}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {isConfirming ? (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--muted, #888)', alignSelf: 'center' }}>Remove?</span>
                    <button
                      className="btn primary"
                      style={{ padding: '3px 10px', fontSize: 11, background: '#e53e3e', border: 'none' }}
                      onClick={() => confirmRemove(doc.id)}
                    >
                      Yes
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '3px 10px', fontSize: 11 }}
                      onClick={() => setConfirmRemoveId(null)}
                    >
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn"
                      style={{ padding: '3px 10px', fontSize: 11 }}
                      onClick={e => startRename(doc, e)}
                    >
                      Rename
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '3px 10px', fontSize: 11 }}
                      onClick={e => handleDownload(doc, e)}
                    >
                      ↓ Download
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '3px 10px', fontSize: 11, color: '#e53e3e', borderColor: '#e53e3e' }}
                      onClick={e => askRemove(doc.id, e)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>

              {/* Chevron */}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{
                  flexShrink: 0,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  opacity: 0.45,
                }}
              >
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* ── Expanded content ── */}
            {isExpanded && (
              <div style={{
                padding: '14px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--accent-bg, rgba(170,59,255,0.03))',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px 24px',
              }}>
                {[
                  { label: 'File Name',      value: doc.fileName },
                  { label: 'File Type',      value: doc.type },
                  { label: 'Size',           value: formatSize(doc.sizeKB) },
                  { label: 'Uploaded',       value: doc.uploadedDate },
                  { label: 'Reorder Count',  value: String(doc.reorderCount) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--muted, #999)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-h)' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

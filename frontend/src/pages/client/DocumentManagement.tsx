import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import TableWrap from '../../components/TableWrap';
import './DocumentManagement.css';
import { useNavigation } from '../../context/NavigationContext';
import { getUploads, createUpload, updateUpload, deleteUpload } from '../../lib/api/uploadsService';
import type { UploadFile } from '../../lib/api/uploadsService';

interface DisplayDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number | null;
  uploadedDate: string;
  reorderCount: number;
  ownerType: 'client';
  ownerId: string;
  fileUrl: string;
  mimeType: string;
}

interface ReorderOptions {
  quantity: number;
  finish: string;
  size: string;
}

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const resolveFileUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function DocumentManagement() {
  return (
    <Suspense fallback={null}>
      <DocumentManagementInner />
    </Suspense>
  );
}

function DocumentManagementInner() {
  const { t } = useTranslation(['common', 'documentManagement']);
  const { navigateTopLevel: _nav } = useNavigation();
  const [documents, setDocuments] = useState<DisplayDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [reorderOptions, setReorderOptions] = useState<Record<string, ReorderOptions>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCustomName, setUploadCustomName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await getUploads();
        const uploads: UploadFile[] = res.data.data;

        const docs: DisplayDocument[] = uploads.map((u) => {
          const rawName = u.file_name || u.url.split('/').pop() || 'file';
          const displayName = rawName.replace(/\.[^/.]+$/, '');
          const ext = rawName.split('.').pop()?.toUpperCase() || '';
          return {
            id: String(u.id),
            name: displayName,
            fileName: rawName,
            type: ext || u.file_type || 'Other',
            sizeKB: u.file_size ? Math.round(u.file_size / 1024) : null,
            uploadedDate: new Date(u.created_at).toISOString().slice(0, 10),
            reorderCount: u.reorder_count ?? 0,
            ownerType: 'client',
            ownerId: String(u.owner_id || u.uploaded_by),
            fileUrl: resolveFileUrl(u.url),
            mimeType: u.mime_type || '',
          };
        });
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load uploads:', err);
        setError(t('documentManagement:error'));
      } finally {
        setLoading(false);
      }
    };
    fetchUploads();
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const formatSize = (kb: number | null): string => {
    if (kb === null || kb === undefined) return 'Unknown';
    return kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
  };
  const showToast = (msg: string) => setToastMessage(msg);

  const totalDocuments = documents.length;
  let maxReorder = 0, mostOrderedName = '—', totalReorders = 0, totalStorageKB = 0;
  documents.forEach((doc) => {
    totalReorders += doc.reorderCount;
    totalStorageKB += doc.sizeKB || 0;
    if (doc.reorderCount > maxReorder) { maxReorder = doc.reorderCount; mostOrderedName = doc.name; }
  });
  const mostOrderedDisplay = maxReorder > 0 ? mostOrderedName.substring(0, 18) : '—';
  const storageUsed = totalStorageKB > 1024 ? (totalStorageKB / 1024).toFixed(1) + ' MB' : totalStorageKB + ' KB';

  const filtered = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getReorderOptions = (docId: string): ReorderOptions => {
    if (!reorderOptions[docId]) return { quantity: 100, finish: 'Glossy', size: 'Standard' };
    return reorderOptions[docId];
  };

  const updateReorderOption = (docId: string, key: keyof ReorderOptions, value: string | number) => {
    setReorderOptions((prev) => ({ ...prev, [docId]: { ...getReorderOptions(docId), [key]: value } }));
  };

  const handleReorder = (doc: DisplayDocument) => {
    const options = getReorderOptions(doc.id);
    const orderRef = '#ORD' + Math.floor(Math.random() * 9000 + 1000);
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, reorderCount: d.reorderCount + 1 } : d));
    showToast(t('documentManagement:toast.reorderPlaced', { ref: orderRef, qty: options.quantity, name: doc.name }));
    setExpandedDocId(null);
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm(t('documentManagement:confirm.delete'))) return;
    try {
      await deleteUpload(Number(docId));
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (expandedDocId === docId) setExpandedDocId(null);
      showToast(t('documentManagement:toast.deleted'));
    } catch {
      showToast(t('documentManagement:toast.deleteError'));
    }
  };

  const openEditModal = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setEditingDocId(docId);
      setEditDocName(doc.name);
      setEditModalOpen(true);
    }
  };

  const saveEdit = async () => {
    if (!editingDocId) return;
    try {
      await updateUpload(Number(editingDocId), { file_name: editDocName.trim() || documents.find((d) => d.id === editingDocId)!.name });
      setDocuments((prev) => prev.map((d) => d.id === editingDocId ? { ...d, name: editDocName.trim() || d.name } : d));
      showToast(t('documentManagement:toast.updated'));
    } catch {
      showToast(t('documentManagement:toast.renameError'));
    }
    setEditModalOpen(false);
    setEditingDocId(null);
    setEditDocName('');
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    if (!['PDF', 'AI', 'PSD', 'JPG', 'JPEG', 'PNG'].includes(ext)) {
      alert(t('documentManagement:alert.unsupportedFormat'));
      return false;
    }
    if (file.size / 1024 > 102400) {
      alert(t('documentManagement:alert.maxFileSize'));
      return false;
    }
    setUploadFile(file);
    return true;
  };

  const confirmUpload = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('file_type', 'content');
    if (uploadCustomName.trim()) formData.append('file_name', uploadCustomName.trim());
    try {
      const res = await createUpload(formData);
      const newUpload = res.data.data;
      const displayName = newUpload.file_name || uploadCustomName.trim() || uploadFile.name.replace(/\.[^/.]+$/, '');
      const fileName = newUpload.file_name || uploadFile.name;
      const ext = fileName.split('.').pop()?.toUpperCase() || '';
      const newDoc: DisplayDocument = {
        id: String(newUpload.id),
        name: displayName,
        fileName,
        type: ext || newUpload.file_type || 'Other',
        sizeKB: newUpload.file_size ? Math.round(newUpload.file_size / 1024) : Math.round(uploadFile.size / 1024),
        uploadedDate: new Date(newUpload.created_at).toISOString().slice(0, 10),
        reorderCount: newUpload.reorder_count ?? 0,
        ownerType: 'client',
        ownerId: String(newUpload.owner_id || newUpload.uploaded_by),
        fileUrl: resolveFileUrl(newUpload.url),
        mimeType: newUpload.mime_type || '',
      };
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(t('documentManagement:toast.uploaded'));
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      showToast(t('documentManagement:toast.uploadError'));
    }
  };

  const cancelUpload = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadCustomName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const adjustQuantity = (docId: string, delta: number) => {
    const curr = getReorderOptions(docId).quantity;
    updateReorderOption(docId, 'quantity', Math.max(1, Math.min(10000, curr + delta)));
  };

  const tableActions = (
    <>
      <div className="search-container">
        <input
          type="search"
          className="input"
          placeholder={t('documentManagement:searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <button className="btn primary" onClick={() => setUploadModalOpen(true)}>
        {t('documentManagement:uploadNew')}
      </button>
    </>
  );

  if (loading) return (
    <AppShell role="client" activePage="document-management">
      <Topbar title={t('documentManagement:title')} />
      <div className="loading-state">{t('documentManagement:loading')}</div>
    </AppShell>
  );

  if (error) return (
    <AppShell role="client" activePage="document-management">
      <Topbar title={t('documentManagement:title')} />
      <div className="error-state">{error}</div>
    </AppShell>
  );

  return (
    <AppShell role="client" activePage="document-management">
      <Topbar title={t('documentManagement:title')} />
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>{t('documentManagement:header')}</h2>
        <p style={{ color: 'var(--muted)' }}>{t('documentManagement:headerSub')}</p>
      </div>
      <section className="grid-4">
        <StatCard label={t('documentManagement:stats.totalDocuments')} value={totalDocuments}      sub={t('documentManagement:stats.savedFiles')} />
        <StatCard label={t('documentManagement:stats.mostOrdered')}    value={mostOrderedDisplay}  sub={t('documentManagement:stats.topDesign')} />
        <StatCard label={t('documentManagement:stats.totalReorders')}  value={totalReorders}       sub={t('documentManagement:stats.lifetimeReorders')} />
        <StatCard label={t('documentManagement:stats.storageUsed')}    value={storageUsed}         sub={t('documentManagement:stats.totalSize')} />
      </section>
      <TableWrap title={t('documentManagement:libraryTitle')} actions={tableActions}>
        <div className="table-responsive">
          <table className="documents-table">
            <thead>
              <tr>
                <th>{t('documentManagement:table.fileName')}</th>
                <th>{t('documentManagement:table.type')}</th>
                <th>{t('documentManagement:table.size')}</th>
                <th>{t('documentManagement:table.uploaded')}</th>
                <th>{t('documentManagement:table.reorders')}</th>
                <th>{t('documentManagement:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>{t('documentManagement:empty')}</td></tr>
              ) : (
                filtered.map((doc) => {
                  const isExpanded = expandedDocId === doc.id;
                  const options = getReorderOptions(doc.id);
                  return (
                    <React.Fragment key={doc.id}>
                      <tr>
                        <td>
                          <strong>{doc.name}</strong><br />
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{doc.fileName}</span>
                        </td>
                        <td><span className="file-type-badge">{doc.type}</span></td>
                        <td>{formatSize(doc.sizeKB)}</td>
                        <td>{doc.uploadedDate}</td>
                        <td>{doc.reorderCount}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn primary btn-sm" onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}>
                              {t('documentManagement:actions.reorder')}
                            </button>
                            <button className="btn btn-sm" onClick={() => {
                              const url = resolveFileUrl(doc.fileUrl);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                                showToast(t('documentManagement:toast.downloaded', { name: doc.name }));
                              } else {
                                showToast(t('documentManagement:toast.downloadUnavailable'));
                              }
                            }}>
                              {t('documentManagement:actions.download')}
                            </button>
                            <button className="btn btn-sm" onClick={() => openEditModal(doc.id)}>
                              {t('documentManagement:actions.edit')}
                            </button>
                            <button className="btn btn-sm" onClick={() => handleDelete(doc.id)}>
                              {t('documentManagement:actions.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className={`reorder-expand-row ${isExpanded ? 'expanded' : ''}`}>
                        <td colSpan={6}>
                          <div className="reorder-panel">
                            <div className="reorder-controls">
                              <div className="quantity-group">
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, -10)}>−</button>
                                <input
                                  type="number"
                                  className="qty-input"
                                  value={options.quantity}
                                  onChange={(e) => updateReorderOption(doc.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                  min={1} max={10000} step={10}
                                />
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, 10)}>+</button>
                              </div>
                              <select className="spec-select" value={options.finish} onChange={(e) => updateReorderOption(doc.id, 'finish', e.target.value)}>
                                <option value="Glossy">{t('documentManagement:reorderPanel.finish.glossy')}</option>
                                <option value="Matte">{t('documentManagement:reorderPanel.finish.matte')}</option>
                                <option value="Uncoated">{t('documentManagement:reorderPanel.finish.uncoated')}</option>
                              </select>
                              <select className="spec-select" value={options.size} onChange={(e) => updateReorderOption(doc.id, 'size', e.target.value)}>
                                <option value="Standard">{t('documentManagement:reorderPanel.size.standard')}</option>
                                <option value="A4">{t('documentManagement:reorderPanel.size.a4')}</option>
                                <option value="A3">{t('documentManagement:reorderPanel.size.a3')}</option>
                                <option value="Custom">{t('documentManagement:reorderPanel.size.custom')}</option>
                              </select>
                              <button className="btn primary" onClick={() => handleReorder(doc)}>
                                {t('documentManagement:actions.confirmReorder')}
                              </button>
                              <button className="btn" onClick={() => setExpandedDocId(null)}>
                                {t('documentManagement:actions.cancel')}
                              </button>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
                              {t('documentManagement:reorderPanel.hint')}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TableWrap>

      {uploadModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('documentManagement:uploadModal.title')}</h3>
              <button className="icon-btn" onClick={cancelUpload}>✕</button>
            </div>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}>
              {uploadFile ? (
                <>{t('documentManagement:uploadModal.dropZoneReady', { name: uploadFile.name })}<br /><span style={{ fontSize: '12px' }}>{t('documentManagement:uploadModal.dropZoneReadySub')}</span></>
              ) : (
                <>{t('documentManagement:uploadModal.dropZoneEmpty')}<br /><span style={{ fontSize: '12px' }}>{t('documentManagement:uploadModal.dropZoneEmptySub')}</span></>
              )}
            </div>
            <input type="file" ref={fileInputRef} accept=".pdf,.ai,.psd,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>{t('documentManagement:uploadModal.nameLabel')}</label>
              <input type="text" className="search-input" placeholder={t('documentManagement:uploadModal.namePlaceholder')} value={uploadCustomName} onChange={(e) => setUploadCustomName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn" onClick={cancelUpload}>{t('documentManagement:uploadModal.cancel')}</button>
              <button className="btn primary" onClick={confirmUpload} disabled={!uploadFile}>{t('documentManagement:uploadModal.upload')}</button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('documentManagement:editModal.title')}</h3>
              <button className="icon-btn" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>{t('documentManagement:editModal.nameLabel')}</label>
              <input type="text" className="search-input" value={editDocName} onChange={(e) => setEditDocName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setEditModalOpen(false)}>{t('documentManagement:editModal.cancel')}</button>
              <button className="btn primary" onClick={saveEdit}>{t('documentManagement:editModal.save')}</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="success-toast">{toastMessage}</div>}
    </AppShell>
  );
}
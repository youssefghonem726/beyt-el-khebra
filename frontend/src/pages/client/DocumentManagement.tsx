import React, { useState, useRef, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import TableWrap from '../../components/TableWrap';
import './DocumentManagement.css';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';
import { getUploads, createUpload, updateUpload, deleteUpload } from '../../lib/api/uploadsService';
import type { UploadFile } from '../../lib/api/uploadsService';

interface DisplayDocument {
  id: string;
  name: string;           // file_name from backend or fallback from url
  fileName: string;       // original file name (from url)
  type: string;
  sizeKB: number;         // still 0 until we store size
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

export default function DocumentManagement() {
  const { navigateTopLevel } = useNavigation();
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

  // Fetch real uploads
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await getUploads();
        const uploads: UploadFile[] = res.data.data;
        console.log('DocumentManagement - uploads:', uploads);

        const docs: DisplayDocument[] = uploads.map((u) => {
          // Use file_name if present, else extract from url
          const rawName = u.file_name || u.url.split('/').pop() || 'file';
          const displayName = rawName.replace(/\.[^/.]+$/, '');
          const ext = rawName.split('.').pop()?.toUpperCase() || '';
          return {
            id: String(u.id),
            name: displayName,
            fileName: rawName,
            type: ext || u.file_type || 'Other',
            sizeKB: 0,
            uploadedDate: new Date(u.created_at).toISOString().slice(0, 10),
            reorderCount: u.reorder_count ?? 0,
            ownerType: 'client',
            ownerId: String(u.owner_id || u.uploaded_by),
            fileUrl: u.url,
            mimeType: u.mime_type || '',
          };
        });
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load uploads:', err);
        setError('Could not load your documents.');
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

  const formatSize = (kb: number): string => (kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB');
  const showToast = (msg: string) => setToastMessage(msg);

  // Stats
  const totalDocuments = documents.length;
  let maxReorder = 0, mostOrderedName = '—', totalReorders = 0, totalStorageKB = 0;
  documents.forEach((doc) => {
    totalReorders += doc.reorderCount;
    totalStorageKB += doc.sizeKB;
    if (doc.reorderCount > maxReorder) { maxReorder = doc.reorderCount; mostOrderedName = doc.name; }
  });
  const mostOrderedDisplay = maxReorder > 0 ? mostOrderedName.substring(0, 18) : '—';
  const storageUsed = totalStorageKB > 1024 ? (totalStorageKB / 1024).toFixed(1) + ' MB' : totalStorageKB + ' KB';

  const filtered = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getReorderOptions = (docId: string): ReorderOptions => {
    if (!reorderOptions[docId]) return { quantity: 100, finish: 'Glossy', size: 'Standard' };
    return reorderOptions[docId];
  };

  const updateReorderOption = (docId: string, key: keyof ReorderOptions, value: string | number) => {
    setReorderOptions(prev => ({ ...prev, [docId]: { ...getReorderOptions(docId), [key]: value } }));
  };

  const handleReorder = (doc: DisplayDocument) => {
    const options = getReorderOptions(doc.id);
    const orderRef = '#ORD' + Math.floor(Math.random() * 9000 + 1000);
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, reorderCount: d.reorderCount + 1 } : d));
    showToast(`✅ Order ${orderRef} placed! ${options.quantity} × "${doc.name}" — We'll send you a quote shortly.`);
    setExpandedDocId(null);
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await deleteUpload(Number(docId));
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (expandedDocId === docId) setExpandedDocId(null);
      showToast('🗑️ Document deleted');
    } catch { showToast('❌ Could not delete'); }
  };

  const openEditModal = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setEditingDocId(docId);
      setEditDocName(doc.name);
      setEditModalOpen(true);
    }
  };

  const saveEdit = async () => {
    if (!editingDocId) return;
    try {
      await updateUpload(Number(editingDocId), { file_name: editDocName.trim() || documents.find(d=>d.id===editingDocId)!.name });
      setDocuments(prev => prev.map(d => d.id === editingDocId ? { ...d, name: editDocName.trim() || d.name } : d));
      showToast('✏️ Document updated');
    } catch { showToast('❌ Could not rename'); }
    setEditModalOpen(false);
    setEditingDocId(null);
    setEditDocName('');
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    if (!['PDF','AI','PSD','JPG','JPEG','PNG'].includes(ext)) { alert('Unsupported format.'); return false; }
    if (file.size / 1024 > 102400) { alert('Max file size 100MB'); return false; }
    setUploadFile(file);
    return true;
  };

  const confirmUpload = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('file_type', 'content'); // default
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
        sizeKB: 0,
        uploadedDate: new Date(newUpload.created_at).toISOString().slice(0, 10),
        reorderCount: newUpload.reorder_count ?? 0,
        ownerType: 'client',
        ownerId: String(newUpload.owner_id || newUpload.uploaded_by),
        fileUrl: newUpload.url,
        mimeType: newUpload.mime_type || '',
      };
      setDocuments(prev => [newDoc, ...prev]);
      showToast('📄 File uploaded');
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { showToast('❌ Upload failed'); }
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
        <input type="search" className="input" placeholder="Search by file name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <button className="btn primary" onClick={() => setUploadModalOpen(true)}>+ Upload New</button>
    </>
  );

  if (loading) return <AppShell role="client" activePage="documents"><Topbar title="My Documents" /><div className="loading-state">Loading...</div></AppShell>;
  if (error) return <AppShell role="client" activePage="documents"><Topbar title="My Documents" /><div className="error-state">{error}</div></AppShell>;

  return (
    <AppShell role="client" activePage="documents">
      <Topbar title="My Documents" />
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Print-Ready Files</h2>
        <p style={{ color: 'var(--muted)' }}>Manage your documents and re-order any design.</p>
      </div>
      <section className="grid-4">
        <StatCard label="Total Documents" value={totalDocuments} sub="Saved print files" />
        <StatCard label="Most Ordered" value={mostOrderedDisplay} sub="Top used design" />
        <StatCard label="Total Re-orders" value={totalReorders} sub="Lifetime re-orders" />
        <StatCard label="Storage Used" value={storageUsed} sub="Total file size" />
      </section>
      <TableWrap title="Document Library" actions={tableActions}>
        <div className="table-responsive">
          <table className="documents-table">
            <thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Re-orders</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>No documents found. Upload your first print file.</td></tr>
              ) : (
                filtered.map(doc => {
                  const isExpanded = expandedDocId === doc.id;
                  const options = getReorderOptions(doc.id);
                  return (
                    <React.Fragment key={doc.id}>
                      <tr>
                        <td><strong>{doc.name}</strong><br/><span style={{ fontSize: '11px', color: 'var(--muted)' }}>{doc.fileName}</span></td>
                        <td><span className="file-type-badge">{doc.type}</span></td>
                        <td>{formatSize(doc.sizeKB)}</td>
                        <td>{doc.uploadedDate}</td>
                        <td>{doc.reorderCount}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn primary btn-sm" onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}>Re-order</button>
                            <button className="btn btn-sm" onClick={() => {
                              downloadText(`${doc.name}.txt`, [`Document: ${doc.name}`,`File: ${doc.fileName}`,`Type: ${doc.type}`,`Size: ${formatSize(doc.sizeKB)}`,`Uploaded: ${doc.uploadedDate}`,`Re-orders: ${doc.reorderCount}`]);
                              showToast(`"${doc.name}" downloaded`);
                            }}>Download</button>
                            <button className="btn btn-sm" onClick={() => openEditModal(doc.id)}>Edit</button>
                            <button className="btn btn-sm" onClick={() => handleDelete(doc.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      <tr className={`reorder-expand-row ${isExpanded ? 'expanded' : ''}`}>
                        <td colSpan={6}>
                          <div className="reorder-panel">
                            <div className="reorder-controls">
                              <div className="quantity-group">
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, -10)}>−</button>
                                <input type="number" className="qty-input" value={options.quantity} onChange={e => updateReorderOption(doc.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} min={1} max={10000} step={10} />
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, 10)}>+</button>
                              </div>
                              <select className="spec-select" value={options.finish} onChange={e => updateReorderOption(doc.id, 'finish', e.target.value)}>
                                <option value="Glossy">Glossy</option>
                                <option value="Matte">Matte</option>
                                <option value="Uncoated">Uncoated</option>
                              </select>
                              <select className="spec-select" value={options.size} onChange={e => updateReorderOption(doc.id, 'size', e.target.value)}>
                                <option value="Standard">Standard</option>
                                <option value="A4">A4</option>
                                <option value="A3">A3</option>
                                <option value="Custom">Custom</option>
                              </select>
                              <button className="btn primary" onClick={() => handleReorder(doc)}>Confirm Re-order</button>
                              <button className="btn" onClick={() => setExpandedDocId(null)}>Cancel</button>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>💡 No price shown yet — we'll send a quote after you confirm.</div>
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

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header"><h3>Upload Document</h3><button className="icon-btn" onClick={cancelUpload}>✕</button></div>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}>
              {uploadFile ? (<>✅ {uploadFile.name}<br/><span style={{ fontSize: '12px' }}>Ready to upload</span></>) : (<>📄 Click or drag file here<br/><span style={{ fontSize: '12px' }}>PDF, AI, PSD, JPG, PNG (max 100MB)</span></>)}
            </div>
            <input type="file" ref={fileInputRef} accept=".pdf,.ai,.psd,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Document Name (optional)</label>
              <input type="text" className="search-input" placeholder="Leave blank to use filename" value={uploadCustomName} onChange={e => setUploadCustomName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn" onClick={cancelUpload}>Cancel</button>
              <button className="btn primary" onClick={confirmUpload} disabled={!uploadFile}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header"><h3>Edit Document</h3><button className="icon-btn" onClick={() => setEditModalOpen(false)}>✕</button></div>
            <div className="form-group">
              <label>Document Name</label>
              <input type="text" className="search-input" value={editDocName} onChange={e => setEditDocName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="success-toast">{toastMessage}</div>}
    </AppShell>
  );
}
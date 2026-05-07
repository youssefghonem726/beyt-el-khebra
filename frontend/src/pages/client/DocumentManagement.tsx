import React, { useState, useRef, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import TableWrap from '../../components/TableWrap';
import './DocumentManagement.css';
import { downloadText } from '../../utils/download';

interface Props {
  onNavigate: (page: string) => void;
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
}

interface ReorderOptions {
  quantity: number;
  finish: string;
  size: string;
}

export default function DocumentManagement({ onNavigate }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
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

  // Fetch documents from JSON file
  useEffect(() => {
    fetch('/data/documents.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Document[]) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
        setError('Could not load your documents. Please try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const formatSize = (kb: number): string => {
    if (kb > 1024) return (kb / 1024).toFixed(1) + ' MB';
    return kb + ' KB';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  // Compute stats from documents
  const totalDocuments = documents.length;
  let maxReorder = 0;
  let mostOrderedName = '—';
  let totalReorders = 0;
  let totalStorageKB = 0;

  documents.forEach((doc) => {
    totalReorders += doc.reorderCount;
    totalStorageKB += doc.sizeKB;
    if (doc.reorderCount > maxReorder) {
      maxReorder = doc.reorderCount;
      mostOrderedName = doc.name;
    }
  });

  const mostOrderedDisplay = maxReorder > 0 ? mostOrderedName.substring(0, 18) : '—';
  const storageUsed = totalStorageKB > 1024
    ? (totalStorageKB / 1024).toFixed(1) + ' MB'
    : totalStorageKB + ' KB';

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getReorderOptions = (docId: string): ReorderOptions => {
    if (!reorderOptions[docId]) {
      return { quantity: 100, finish: 'Glossy', size: 'Standard' };
    }
    return reorderOptions[docId];
  };

  const updateReorderOption = (docId: string, key: keyof ReorderOptions, value: string | number) => {
    setReorderOptions((prev) => ({
      ...prev,
      [docId]: { ...getReorderOptions(docId), [key]: value },
    }));
  };

  const handleReorder = (doc: Document) => {
    const options = getReorderOptions(doc.id);
    const quantity = options.quantity;
    const orderRef = '#ORD' + Math.floor(Math.random() * 9000 + 1000);

    setDocuments((prevDocs) =>
      prevDocs.map((d) =>
        d.id === doc.id ? { ...d, reorderCount: d.reorderCount + 1 } : d
      )
    );

    showToast(
      `✅ Order ${orderRef} placed! ${quantity} × "${doc.name}" — We'll send you a quote shortly.`
    );

    setExpandedDocId(null);
  };

  const handleDelete = (docId: string) => {
    if (window.confirm('Delete this document permanently?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (expandedDocId === docId) setExpandedDocId(null);
      showToast('🗑️ Document deleted');
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

  const saveEdit = () => {
    if (editingDocId) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === editingDocId ? { ...d, name: editDocName.trim() || d.name } : d
        )
      );
      showToast('✏️ Document updated');
      setEditModalOpen(false);
      setEditingDocId(null);
      setEditDocName('');
    }
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const validTypes = ['PDF', 'AI', 'PSD', 'JPG', 'JPEG', 'PNG'];
    if (ext === 'JPEG') {
      // type remains JPG for consistency
    }
    if (!validTypes.includes(ext)) {
      alert('Unsupported format. Use PDF, AI, PSD, JPG, or PNG.');
      return false;
    }
    if (file.size / 1024 > 102400) {
      alert('Max file size 100MB');
      return false;
    }
    setUploadFile(file);
    return true;
  };

  const confirmUpload = () => {
    if (!uploadFile) return;
    const ext = uploadFile.name.split('.').pop()?.toUpperCase() || '';
    let type = ext;
    if (ext === 'JPEG') type = 'JPG';
    const finalName = uploadCustomName.trim() || uploadFile.name.replace(/\.[^/.]+$/, '');
    const newId = 'doc_' + Date.now();
    const newDoc: Document = {
      id: newId,
      name: finalName,
      fileName: uploadFile.name,
      type: type,
      sizeKB: uploadFile.size / 1024,
      uploadedDate: new Date().toISOString().slice(0, 10),
      reorderCount: 0,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`📄 ${finalName} uploaded`);
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadCustomName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelUpload = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadCustomName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const adjustQuantity = (docId: string, delta: number) => {
    const current = getReorderOptions(docId).quantity;
    const newVal = Math.max(1, Math.min(10000, current + delta));
    updateReorderOption(docId, 'quantity', newVal);
  };

  // Actions for the TableWrap (search + upload button)
  const tableActions = (
    <>
      <input
        type="text"
        className="input"
        style={{ width: 220 }}
        placeholder="Search by file name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button className="btn primary" onClick={() => setUploadModalOpen(true)}>
        + Upload New
      </button>
    </>
  );

  if (loading) {
    return (
      <AppShell role="client" activePage="documents" onNavigate={onNavigate}>
        <Topbar title="My Documents" />
        <div className="loading-state">Loading your documents...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="documents" onNavigate={onNavigate}>
        <Topbar title="My Documents" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="documents" onNavigate={onNavigate}>
      <Topbar title="My Documents" />

      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Print-Ready Files</h2>
        <p style={{ color: 'var(--muted)' }}>Manage your documents and re-order any design with custom quantity.</p>
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
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Re-orders</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={6}>No documents found. Upload your first print file.</td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isExpanded = expandedDocId === doc.id;
                  const options = getReorderOptions(doc.id);
                  return (
                    <React.Fragment key={doc.id}>
                      <tr>
                        <td>
                          <strong>{doc.name}</strong>
                          <br />
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{doc.fileName}</span>
                        </td>
                        <td>
                          <span className="file-type-badge">{doc.type}</span>
                        </td>
                        <td>{formatSize(doc.sizeKB)}</td>
                        <td>{doc.uploadedDate}</td>
                        <td>{doc.reorderCount}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn primary btn-sm"
                              onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                            >
                              Re-order
                            </button>
                            <button className="btn btn-sm" onClick={() => {
                              downloadText(`${doc.name}.txt`, [
                                `Document: ${doc.name}`,
                                `File:     ${doc.fileName}`,
                                `Type:     ${doc.type}`,
                                `Size:     ${formatSize(doc.sizeKB)}`,
                                `Uploaded: ${doc.uploadedDate}`,
                                `Re-orders: ${doc.reorderCount}`,
                              ]);
                              showToast(`"${doc.name}" downloaded`);
                            }}>
                              Download
                            </button>
                            <button className="btn btn-sm" onClick={() => openEditModal(doc.id)}>
                              Edit
                            </button>
                            <button className="btn btn-sm" onClick={() => handleDelete(doc.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className={`reorder-expand-row ${isExpanded ? 'expanded' : ''}`}>
                        <td colSpan={6}>
                          <div className="reorder-panel">
                            <div className="reorder-controls">
                              <div className="quantity-group">
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, -10)}>
                                  −
                                </button>
                                <input
                                  type="number"
                                  className="qty-input"
                                  value={options.quantity}
                                  onChange={(e) =>
                                    updateReorderOption(doc.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                                  }
                                  min={1}
                                  max={10000}
                                  step={10}
                                />
                                <button className="qty-btn" onClick={() => adjustQuantity(doc.id, 10)}>
                                  +
                                </button>
                              </div>
                              <select
                                className="spec-select"
                                value={options.finish}
                                onChange={(e) => updateReorderOption(doc.id, 'finish', e.target.value)}
                              >
                                <option value="Glossy">Glossy finish</option>
                                <option value="Matte">Matte finish</option>
                                <option value="Uncoated">Uncoated</option>
                              </select>
                              <select
                                className="spec-select"
                                value={options.size}
                                onChange={(e) => updateReorderOption(doc.id, 'size', e.target.value)}
                              >
                                <option value="Standard">Standard size</option>
                                <option value="A4">A4</option>
                                <option value="A3">A3</option>
                                <option value="Custom">Custom size</option>
                              </select>
                              <button className="btn primary" onClick={() => handleReorder(doc)}>
                                Confirm Re-order
                              </button>
                              <button className="btn" onClick={() => setExpandedDocId(null)}>
                                Cancel
                              </button>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
                              💡 No price shown yet — we'll send a quote after you confirm.
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

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button className="icon-btn" onClick={cancelUpload}>
                ✕
              </button>
            </div>
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {uploadFile ? (
                <>
                  ✅ {uploadFile.name}
                  <br />
                  <span style={{ fontSize: '12px' }}>Ready to upload</span>
                </>
              ) : (
                <>
                  📄 Click or drag file here
                  <br />
                  <span style={{ fontSize: '12px' }}>PDF, AI, PSD, JPG, PNG (max 100MB)</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.ai,.psd,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Document Name (optional)</label>
              <input
                type="text"
                className="search-input"
                placeholder="Leave blank to use filename"
                value={uploadCustomName}
                onChange={(e) => setUploadCustomName(e.target.value)}
              />
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
            <div className="modal-header">
              <h3>Edit Document</h3>
              <button className="icon-btn" onClick={() => setEditModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="form-group">
              <label>Document Name</label>
              <input
                type="text"
                className="search-input"
                value={editDocName}
                onChange={(e) => setEditDocName(e.target.value)}
              />
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
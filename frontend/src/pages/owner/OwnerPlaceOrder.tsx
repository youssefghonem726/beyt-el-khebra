import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

interface PricingRow {
  id: string;
  product: string;
  size: string;
  paper: string;
  pricePerUnit: number;
  minQty: number;
  active: boolean;
}

interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
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
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OwnerPlaceOrder() {
  const [clients, setClients]       = useState<Client[]>([]);
  const [products, setProducts]     = useState<PricingRow[]>([]);
  const [allDocs, setAllDocs]       = useState<Record<string, ClientDocument[]>>({});

  const [selectedClient, setSelectedClient]   = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity]               = useState('');
  const [selectedDocId, setSelectedDocId]     = useState('');
  const [notes, setNotes]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);
  const [toast, setToast]                     = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/clients.json')
      .then(r => r.json())
      .then(setClients)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/pricing.json')
      .then(r => r.json())
      .then((data: PricingRow[]) => setProducts(data.filter(p => p.active)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/client-documents.json')
      .then(r => r.json())
      .then(setAllDocs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const clientDocs: ClientDocument[] = selectedClient ? (allDocs[selectedClient] ?? []) : [];
  const activeProducts = products.filter(p => p.active);
  const chosenProduct  = activeProducts.find(p => p.id === selectedProduct);
  const chosenClient   = clients.find(c => c.name === selectedClient);
  const chosenDoc      = clientDocs.find(d => d.id === selectedDocId);

  const qty      = parseInt(quantity, 10);
  const subtotal = chosenProduct && !isNaN(qty) && qty > 0
    ? chosenProduct.pricePerUnit * qty
    : 0;

  const canSubmit =
    !!selectedClient &&
    !!selectedProduct &&
    !isNaN(qty) && qty > 0 &&
    !!selectedDocId;

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  function resetForm() {
    setSelectedClient('');
    setSelectedProduct('');
    setQuantity('');
    setSelectedDocId('');
    setNotes('');
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <AppShell role="owner" activePage="owner-place-order">
        <Topbar title="Place Order" />
        <section className="box" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--primary)' }}>✓</div>
          <h2 style={{ marginBottom: 8 }}>Order Placed!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 14 }}>
            Order assigned to <strong>{selectedClient}</strong>
          </p>
          <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
            Product: <strong>{chosenProduct?.product}</strong> &nbsp;·&nbsp; Qty: <strong>{quantity}</strong>
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn primary" onClick={resetForm}>Place Another Order</button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-place-order">
      <Topbar title="Place Order" />

      <div className="split" style={{ alignItems: 'flex-start' }}>

        {/* ── Left: Form ── */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Step 1 — Client */}
          <section className="box">
            <h3 style={{ marginBottom: 14 }}>1. Select Client</h3>

            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Client</label>
              <select
                className="select"
                value={selectedClient}
                onChange={e => { setSelectedClient(e.target.value); setSelectedDocId(''); }}
              >
                <option value="">— Choose a client —</option>
                {clients.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {chosenClient && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--primary-soft)', borderRadius: 8,
                fontSize: 13, display: 'grid', gap: 3,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{chosenClient.name}</span>
                <span style={{ color: 'var(--muted)' }}>{chosenClient.email}</span>
                <span style={{ color: 'var(--muted)' }}>{chosenClient.phone}</span>
              </div>
            )}
          </section>

          {/* Step 2 — Client Documents */}
          {selectedClient && (
            <section className="box">
              <h3 style={{ marginBottom: 4 }}>2. Choose Client Document</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Select the file this order should be printed from.
              </p>

              {clientDocs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                  No documents uploaded by this client yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {clientDocs.map(doc => {
                    const selected = doc.id === selectedDocId;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          background: selected ? 'var(--primary-soft)' : 'var(--surface)',
                          transition: 'border-color .15s, background .15s',
                        }}
                      >
                        {/* File type badge */}
                        <div style={{
                          width: 42, height: 42, borderRadius: 8, flexShrink: 0,
                          background: fileTypeColor(doc.type),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
                        }}>
                          {doc.type}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {doc.fileName} &nbsp;·&nbsp; {fmtSize(doc.sizeKB)} &nbsp;·&nbsp; {doc.uploadedDate}
                          </div>
                        </div>

                        {/* Selected indicator */}
                        {selected && (
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--primary)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 13, fontWeight: 700,
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Step 3 — Product & Quantity */}
          <section className="box">
            <h3 style={{ marginBottom: 14 }}>3. Order Details</h3>

            <div className="field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Product</label>
              <select
                className="select"
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
              >
                <option value="">— Choose a product —</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product} — {p.size} / {p.paper}
                  </option>
                ))}
              </select>
            </div>

            {chosenProduct && (
              <div style={{
                marginBottom: 14, padding: '10px 14px',
                background: 'var(--surface-soft)', borderRadius: 8,
                fontSize: 13, display: 'flex', gap: 20,
                border: '1px solid var(--border)',
              }}>
                <span><strong>Size:</strong> {chosenProduct.size}</span>
                <span><strong>Paper:</strong> {chosenProduct.paper}</span>
                <span><strong>Unit price:</strong> EGP {fmtCurrency(chosenProduct.pricePerUnit)}</span>
                <span><strong>Min qty:</strong> {chosenProduct.minQty}</span>
              </div>
            )}

            <div className="field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Quantity</label>
              <input
                className="input"
                type="number"
                min={chosenProduct?.minQty ?? 1}
                placeholder={chosenProduct ? `Min ${chosenProduct.minQty}` : 'e.g. 500'}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                style={{ width: 160 }}
              />
              {chosenProduct && !isNaN(qty) && qty > 0 && qty < chosenProduct.minQty && (
                <p style={{ fontSize: 12, color: '#e74c3c', marginTop: 4 }}>
                  Minimum quantity for this product is {chosenProduct.minQty}.
                </p>
              )}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Special instructions, finishing details…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>
          </section>
        </div>

        {/* ── Right: Summary sidebar ── */}
        <aside className="box" style={{ position: 'sticky', top: 18, alignSelf: 'flex-start', minWidth: 260 }}>
          <h3 style={{ marginBottom: 16 }}>Order Summary</h3>

          <div style={{ display: 'grid', gap: 10, fontSize: 13, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Client</span>
              <span style={{ fontWeight: 600 }}>{selectedClient || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Product</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160 }}>
                {chosenProduct ? chosenProduct.product : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Quantity</span>
              <span style={{ fontWeight: 600 }}>
                {!isNaN(qty) && qty > 0 ? qty.toLocaleString() : '—'}
              </span>
            </div>

            {chosenDoc && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--muted)' }}>Document</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160 }}>{chosenDoc.name}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Est. Total</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: subtotal > 0 ? 'var(--text)' : 'var(--muted)' }}>
                {subtotal > 0 ? `EGP ${fmtCurrency(subtotal)}` : '—'}
              </span>
            </div>
          </div>

          {/* Validation hints */}
          {!canSubmit && (
            <ul style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, paddingLeft: 16 }}>
              {!selectedClient   && <li>Select a client</li>}
              {!selectedDocId    && selectedClient && clientDocs.length > 0 && <li>Choose a document</li>}
              {!selectedProduct  && <li>Choose a product</li>}
              {(!quantity || isNaN(qty) || qty <= 0) && <li>Enter a valid quantity</li>}
              {chosenProduct && !isNaN(qty) && qty > 0 && qty < chosenProduct.minQty && (
                <li>Quantity below minimum ({chosenProduct.minQty})</li>
              )}
            </ul>
          )}

          <button
            className="btn primary block"
            disabled={!canSubmit || (!!chosenProduct && !isNaN(qty) && qty > 0 && qty < chosenProduct.minQty)}
            onClick={handleSubmit}
          >
            Place Order
          </button>

          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
            Order will be sent to the Unpriced Queue for pricing.
          </p>
        </aside>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2f3640', color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}

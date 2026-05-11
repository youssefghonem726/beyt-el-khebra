import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import DocumentSection from '../../components/DocumentSection';

// ── Types ──────────────────────────────────────────────────────────────────

interface BasePricingRow {
  id: string;
  product: string;
  size: string;
  paper: string;
  pricePerUnit: number;
  minQty: number;
  active: boolean;
}

interface ClientPricingOverride {
  id: string;
  pricePerUnit: number;
  active: boolean;
}

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  stats: { label: string; value: string }[];
  pricingOverrides?: ClientPricingOverride[];
  orders: {
    id: string;
    product: string;
    status: string;
    date: string;
    total: string;
  }[];
}

interface MergedPricingRow extends BasePricingRow {
  pricePerUnit: number;
  active: boolean;
}

// ── Helper ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id: clientId = 'client-detail-ahmed' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();

  const [client, setClient]         = useState<ClientDetail | null>(null);
  const [pricing, setPricing]       = useState<MergedPricingRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [editId, setEditId]         = useState<string | null>(null);
  const [editPrice, setEditPrice]   = useState('');
  const [editMinQty, setEditMinQty] = useState('');
  const [toast, setToast]           = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/pricing.json').then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<BasePricingRow[]>; }),
      fetch('/data/clients-detail.json').then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<ClientDetail[]>; }),
    ])
      .then(([basePricing, clients]) => {
        const found = clients.find(c => c.id === clientId);
        if (!found) { setError(`Client with ID "${clientId}" not found.`); setLoading(false); return; }

        const merged: MergedPricingRow[] = basePricing.map(base => {
          const override = found.pricingOverrides?.find(o => o.id === base.id);
          return override
            ? { ...base, pricePerUnit: override.pricePerUnit, active: override.active }
            : { ...base };
        });

        setClient(found);
        setPricing(merged);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError('Could not load client data. Please try again later.');
        setLoading(false);
      });
  }, [clientId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const startEdit = (row: MergedPricingRow) => {
    setEditId(row.id);
    setEditPrice(String(row.pricePerUnit));
    setEditMinQty(String(row.minQty));
  };

  const saveEdit = (rowId: string) => {
    const price = parseFloat(editPrice);
    const qty   = parseInt(editMinQty, 10);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) return;
    setPricing(ps => ps.map(p => p.id === rowId ? { ...p, pricePerUnit: price, minQty: qty } : p));
    setEditId(null);
    setToast('Price updated.');
  };

  const toggleActive = (rowId: string) => {
    setPricing(ps => ps.map(p => p.id === rowId ? { ...p, active: !p.active } : p));
  };

  // ── Loading / error states ─────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar"><h1>Client Details</h1></header>
        <section className="box"><div className="loading-state">Loading client details...</div></section>
      </AppShell>
    );
  }

  if (error || !client) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar"><h1>Client Details</h1></header>
        <section className="box"><div className="error-state">{error || 'Client data unavailable.'}</div></section>
      </AppShell>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <AppShell role="owner" activePage="client-management">
      <header className="topbar">
        <h1>Client Details - {client.name}</h1>
        <button className="btn" onClick={() => navigateTopLevel('client-management')}>
          Back to Client Management
        </button>
      </header>

      {/* ── Info ── */}
      <section className="box">
        <div className="form-grid-2">
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Phone Number:</strong> {client.phone}</p>
          <p><strong>Address:</strong> {client.address}</p>
          <p><strong>Email:</strong> {client.email}</p>
        </div>
        <div className="line" />
        <div className="stats-grid">
          {client.stats.map(s => (
            <div key={s.label} className="stat-item">
              <p>{s.label}</p>
              <h4>{s.value}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* ── Documents ── */}
      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Documents</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Click a document to expand its preview. Rename, download, or remove files below.
          </p>
        </div>
        <DocumentSection clientId={clientId} />
      </section>

      {/* ── Client Pricing ── */}
      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Client Pricing</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Overrides default pricing for this client. Click Edit to change a row.
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Paper / Material</th>
              <th style={{ textAlign: 'right' }}>Price / Unit (EGP)</th>
              <th style={{ textAlign: 'center' }}>Min Qty</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map(row => (
              <tr key={row.id} style={{ opacity: row.active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{row.product}</td>
                <td>{row.size}</td>
                <td>{row.paper}</td>

                {editId === row.id ? (
                  <>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        style={{ width: 90, textAlign: 'right', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={editMinQty}
                        onChange={e => setEditMinQty(e.target.value)}
                        style={{ width: 70, textAlign: 'center', padding: '4px 8px' }}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(row.pricePerUnit)}</td>
                    <td style={{ textAlign: 'center' }}>{row.minQty}</td>
                  </>
                )}

                <td style={{ textAlign: 'center' }}>
                  <span
                    className={`status ${row.active ? 'done' : 'canceled'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleActive(row.id)}
                    title="Click to toggle"
                  >
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td style={{ textAlign: 'center' }}>
                  {editId === row.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        className="btn primary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => saveEdit(row.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Past Orders ── */}
      <section className="table-wrap" style={{ marginTop: 14 }}>
        <h3>Past Orders</h3>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {client.orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.product}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.date}</td>
                <td>{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Toast ── */}
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

import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

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

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientManagement() {
  const { navigateTopLevel } = useNavigation();
  const [query, setQuery]             = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [pricing, setPricing]         = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editPrice, setEditPrice]     = useState('');
  const [editMinQty, setEditMinQty]   = useState('');
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/clients.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Client[]) => { setClients(data); setLoading(false); })
      .catch(() => { setError('Could not load client data.'); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/data/pricing.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: PricingRow[]) => { setPricing(data); setPricingLoading(false); })
      .catch(() => setPricingLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const startEdit = (row: PricingRow) => {
    setEditId(row.id);
    setEditPrice(String(row.pricePerUnit));
    setEditMinQty(String(row.minQty));
  };

  const saveEdit = (id: string) => {
    const price = parseFloat(editPrice);
    const qty   = parseInt(editMinQty, 10);
    if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return;
    setPricing(ps => ps.map(p => p.id === id ? { ...p, pricePerUnit: price, minQty: qty } : p));
    setEditId(null);
    setToast('Price updated.');
  };

  const toggleActive = (id: string) => {
    setPricing(ps => ps.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const filtered = clients.filter(c => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management">
        <Topbar title="Client Management" />
        <section className="box"><div className="loading-state">Loading clients...</div></section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="client-management">
        <Topbar title="Client Management" />
        <section className="box"><div className="error-state">{error}</div></section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="client-management">
      <Topbar title="Client Management" />

      {/* ── Clients grid ── */}
      <section className="box" style={{ marginBottom: 16 }}>
        <div className="table-head">
          <h3>All Clients</h3>
          <div className="search-container">
            <input
              className="input"
              type="search"
              placeholder="Search by name, email, or phone"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>Status</label>
                  <select className="select"><option>All Status</option><option>Active</option><option>Inactive</option></select>
                </div>
                <div className="field">
                  <label>Type</label>
                  <select className="select"><option>All Types</option><option>Individual</option><option>Business</option></select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
              </div>
            )}
          </div>
        </div>
        <div className="client-grid">
          {filtered.map(c => (
            <a
              key={c.name}
              className="client-card-link"
              href="#"
              onClick={e => { e.preventDefault(); if (c.page) navigateTopLevel(`/owner/clients/${c.page}`); }}
            >
              <h3>{c.name}</h3>
              <p>{c.email}</p>
              <p>{c.phone}</p>
              <p><strong>Click to open full profile</strong></p>
            </a>
          ))}
        </div>
      </section>

      {/* ── Pricing table ── */}
      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 14 }}>
          <h3>Product Pricing</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Click a row to edit price or minimum quantity.</p>
        </div>

        {pricingLoading ? (
          <div className="loading-state">Loading pricing...</div>
        ) : (
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
                        <button className="btn primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => saveEdit(row.id)}>Save</button>
                        <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => startEdit(row)}>Edit</button>
                    )}
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
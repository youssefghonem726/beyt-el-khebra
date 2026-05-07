import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';

interface Props { onNavigate: (page: string) => void; }

interface UnpricedJob {
  id: string;
  client: string;
  product: string;
  qty: number;
  deadline: string;
}

interface PricingState {
  unitPrice: string;
  vatRate: string;
  notes: string;
}

interface PriceListRow {
  id: string;
  product: string;
  paper: string;
  pricePerUnit: number;
  active: boolean;
}

export default function UnpricedQueue({ onNavigate }: Props) {
  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingState>({ unitPrice: '', vatRate: '14', notes: '' });
  const [priced, setPriced] = useState<Set<string>>(new Set());
  const [priceList, setPriceList] = useState<PriceListRow[]>([]);

  useEffect(() => {
    fetch('/data/unpriced-jobs.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: UnpricedJob[]) => { setJobs(data); setLoading(false); })
      .catch(err => { console.error(err); setError('Could not load queue data.'); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/data/pricing.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: PriceListRow[]) => setPriceList(data.filter(p => p.active)))
      .catch(() => {});
  }, []);

  const openPricing = (id: string) => {
    setPricingId(id === pricingId ? null : id);
    setPricing({ unitPrice: '', vatRate: '14', notes: '' });
  };

  const submitPrice = (job: UnpricedJob) => {
    setPriced(s => { const n = new Set(s); n.add(job.id); return n; });
    setPricingId(null);
  };

  const unitPrice = parseFloat(pricing.unitPrice) || 0;
  const vatRate   = parseFloat(pricing.vatRate) / 100 || 0;

  const getSubtotal = (qty: number) => unitPrice * qty;
  const getVat      = (qty: number) => getSubtotal(qty) * vatRate;
  const getTotal    = (qty: number) => getSubtotal(qty) + getVat(qty);

  const fmt = (n: number) => n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const shell = (children: React.ReactNode) => (
    <AppShell role="owner" activePage="unpriced-queue" onNavigate={onNavigate}>
      <Topbar title="Unpriced Queue" />
      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Total Unpriced"       value={jobs.length}  sub="Jobs waiting for pricing" />
        <StatCard label="Due Soon"             value={2}            sub="Due within 3 days"        />
        <StatCard label="Overdue"              value={0}            sub="No overdue jobs"          />
        <StatCard label="Average Processing"   value="1.3d"         sub="Average queue time"       />
      </section>
      {children}
    </AppShell>
  );

  if (loading) return shell(<div className="loading-state">Loading jobs...</div>);
  if (error)   return shell(<div className="error-state">{error}</div>);

  const pending = jobs.filter(j => !priced.has(j.id));

  return shell(
    <section className="table-wrap">
      <div className="table-head">
        <h3>Unpriced Jobs</h3>
        {priced.size > 0 && (
          <span className="muted" style={{ fontSize: 13 }}>{priced.size} job{priced.size > 1 ? 's' : ''} priced this session</span>
        )}
      </div>

      {pending.length === 0 && (
        <p className="muted" style={{ padding: '20px 0' }}>All jobs have been priced.</p>
      )}

      <div className="stack">
        {pending.map((j) => {
          const isOpen = pricingId === j.id;
          return (
            <article key={j.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4>{j.id}</h4>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: '#fef3cd', color: '#856404', fontWeight: 600 }}>
                  UNPRICED
                </span>
              </div>
              <p style={{ marginBottom: 2 }}><strong>Client:</strong> {j.client}</p>
              <p style={{ marginBottom: 2 }}><strong>Product:</strong> {j.product}</p>
              <p style={{ marginBottom: 2 }}><strong>Quantity:</strong> {j.qty} pcs</p>
              <p style={{ marginBottom: 10 }}><strong>Deadline:</strong> {j.deadline}</p>

              <div className="card-actions">
                <button
                  className={`btn${isOpen ? ' primary' : ''}`}
                  onClick={() => openPricing(j.id)}
                >
                  {isOpen ? 'Cancel' : 'Price This Job'}
                </button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 14, padding: '16px', background: 'var(--surface-2, #f8f9fb)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>Set Price for {j.id}</h4>

                  {priceList.length > 0 && (
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>Pick from price list</label>
                      <select
                        className="select"
                        defaultValue=""
                        onChange={e => {
                          if (!e.target.value) return;
                          setPricing(p => ({ ...p, unitPrice: e.target.value }));
                        }}
                      >
                        <option value="">— Select a product —</option>
                        {priceList.map(row => (
                          <option key={row.id} value={String(row.pricePerUnit)}>
                            {row.product} · {row.paper} — EGP {row.pricePerUnit.toFixed(2)} / unit
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Unit Price (EGP)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 2.50"
                        value={pricing.unitPrice}
                        onChange={e => setPricing(p => ({ ...p, unitPrice: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>VAT Rate (%)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="14"
                        value={pricing.vatRate}
                        onChange={e => setPricing(p => ({ ...p, vatRate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {unitPrice > 0 && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fff', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">Subtotal ({j.qty} × EGP {fmt(unitPrice)})</span>
                        <span>EGP {fmt(getSubtotal(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">VAT ({pricing.vatRate}%)</span>
                        <span>EGP {fmt(getVat(j.qty))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Total</span>
                        <span>EGP {fmt(getTotal(j.qty))}</span>
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>Notes (optional)</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, resize: 'vertical' }}
                      placeholder="Any special pricing notes or conditions…"
                      value={pricing.notes}
                      onChange={e => setPricing(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn primary"
                      disabled={!pricing.unitPrice || unitPrice <= 0}
                      onClick={() => submitPrice(j)}
                    >
                      Submit Quote
                    </button>
                    <button className="btn" onClick={() => setPricingId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

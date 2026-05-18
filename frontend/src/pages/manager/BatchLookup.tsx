import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';
// Direct service imports – bypasses VITE_USE_MOCK
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

// ─── Backend shapes ─────────────────────────────────────────────────
interface BackendBatch {
  id: number;
  orderId: number;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo?: string | null;
  deadline?: string | null;
  status: string;
  stages?: { stage: string; status: string; updatedAt?: string }[];
  notes?: string;
}

interface BackendOrder {
  id: number;
  customer: number;
  created_at?: string;
}

// ─── Display shape ──────────────────────────────────────────────────
interface BatchView {
  code: string;
  order: string;
  client: string;
  status: string;
  date: string;
  product: string;
  qty: number;
  progress: number;
  priority: string;
  assignedTo: string;
  deadline: string;
  notes?: string;
  stages: { stage: string; status: string; updatedAt: string }[];
  clientInfo: { address: string; phone: string; taxId: string };
}

// ─── Helpers ───────────────────────────────────────────────────────
function formatDateShort(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BatchLookup({ role = 'manager' }: Props) {
  const [batches, setBatches] = useState<BatchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<BatchView | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesRes, ordersRes, clientsRes] = await Promise.all([
          getBatches(),
          getOrders(),
          getClients(),
        ]);

        const batchesRaw: BackendBatch[] = batchesRes.data.data;
        const orders: BackendOrder[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        console.log('BatchLookup - batches:', batchesRaw);
        console.log('BatchLookup - orders:', orders);
        console.log('BatchLookup - clients:', clients);

        // Build lookup maps
        const orderMap = new Map(orders.map(o => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c]));

        const batchViews: BatchView[] = batchesRaw.map((b: BackendBatch) => {
          const order = orderMap.get(b.orderId);
          const client = order ? clientMap.get(order.customer) : null;
          const clientName = client ? client.name : 'Unknown';
          const dateStr = order?.created_at ? formatDateShort(order.created_at) : '—';

          return {
            code: String(b.id),
            order: `#${b.orderId}`,
            client: clientName,
            status: b.status,
            date: dateStr,
            product: b.product,
            qty: b.qty,
            progress: b.progress,
            priority: b.priority,
            assignedTo: b.assignedTo || 'Unassigned',
            deadline: formatDateShort(b.deadline ?? null),
            notes: b.notes,
            stages: (b.stages || []).map(s => ({
              ...s,
              updatedAt: s.updatedAt ? formatDateTime(s.updatedAt) : '—',
            })),
            clientInfo: {
              address: client?.address || '—',
              phone: client?.phone || '—',
              taxId: client?.taxId || '—',
            },
          };
        });

        setBatches(batchViews);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setBatches([]);
        } else {
          console.error('Failed to load batch data:', err);
          setError('Could not load batch data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = batches.filter((b) => {
    const q = query.toLowerCase();
    return !q || b.code.toLowerCase().includes(q) || b.order.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
  });

  const pct = (b: BatchView) => b.qty > 0 ? Math.round((b.progress / b.qty) * 100) : 0;

  if (loading) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'batch-lookup'}>
        <Topbar title="Batch Lookup & Search" />
        <div className="loading-state">Loading batches...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'batch-lookup'}>
        <Topbar title="Batch Lookup & Search" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={role === 'owner' ? 'owner-dashboard' : 'batch-lookup'}>
      <Topbar title="Batch Lookup & Search" />
      <section className="table-wrap">
        <div className="table-head">
          <div className="actions-inline" style={{ flex: 1 }}>
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder="Search by batch code, order ID, client..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>Status</label>
                    <select className="select">
                      <option value="">All Status</option>
                      <option>Active</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                </div>
              )}
            </div>
          </div>
          <button
            className="btn"
            onClick={() => {
              const header = 'Batch Code,Order,Client,Status,Date';
              const rows = filtered.map((b) => `${b.code},${b.order},${b.client},${b.status},${b.date}`);
              downloadText('batch-export.csv', [header, ...rows]);
            }}
          >
            Export Search Query
          </button>
        </div>
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Batch Code</th><th>Order</th><th>Client Name</th><th>Status</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} className="no-results">No matching results</td></tr>
                : filtered.map((b) => (
                  <tr key={b.code}>
                    <td>{b.code}</td>
                    <td>{b.order}</td>
                    <td>{b.client}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{b.date}</td>
                    <td><button className="btn" onClick={() => setSelected(b)}>View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 660, boxShadow: '0 25px 50px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border, #e4e6eb)', position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 1 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Batch {selected.code}</h2>
              <button onClick={() => setSelected(null)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✕ Close</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ fontSize: 13 }}>Order {selected.order} · {selected.date}</p>
                <StatusBadge status={selected.status} />
              </div>

              <h4 style={{ marginBottom: 8 }}>Job Details</h4>
              <div className="form-grid-2" style={{ fontSize: 13, gap: 6, marginBottom: 14 }}>
                <p><strong>Client:</strong> {selected.client}</p>
                <p><strong>Product:</strong> {selected.product}</p>
                <p><strong>Quantity:</strong> {selected.qty} pcs</p>
                <p><strong>Priority:</strong> {selected.priority}</p>
                <p><strong>Deadline:</strong> {selected.deadline}</p>
                <p><strong>Assigned To:</strong> {selected.assignedTo}</p>
                {selected.notes && <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selected.notes}</p>}
              </div>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>Production Progress</h4>
              <ProgressBar percent={pct(selected)} color={pct(selected) === 100 ? 'green' : pct(selected) >= 50 ? 'orange' : undefined} />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
                {selected.progress} / {selected.qty} printed ({pct(selected)}%)
              </p>

              <table style={{ marginBottom: 14 }}>
                <thead><tr><th>Stage</th><th>Status</th><th>Updated At</th></tr></thead>
                <tbody>
                  {selected.stages.map((s) => (
                    <tr key={s.stage}>
                      <td>{s.stage}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>{s.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>Client Info</h4>
              <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                <p><strong>{selected.client}</strong></p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.address}</p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.phone}</p>
                <p style={{ color: 'var(--muted)' }}>Tax ID: {selected.clientInfo.taxId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

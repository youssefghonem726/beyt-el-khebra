import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { downloadText } from '../../utils/download';
import { getBatches } from '../../lib/api/batchesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

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
  return (
    <Suspense fallback={null}>
      <BatchLookupInner role={role} />
    </Suspense>
  );
}

function BatchLookupInner({ role = 'manager' }: Props) {
  const { t } = useTranslation(['common', 'batchLookup']);
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
          getBatches(), getOrders(), getClients(),
        ]);

        const batchesRaw: BackendBatch[] = batchesRes.data.data;
        const orders: BackendOrder[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const clientMap = new Map(clients.map((c: any) => [c.id, c]));

        const batchViews: BatchView[] = batchesRaw.map((b) => {
          const order = orderMap.get(b.orderId);
          const client = order ? clientMap.get(order.customer) : null;

          return {
            code: String(b.id),
            order: `#${b.orderId}`,
            client: client ? client.name : 'Unknown',
            status: b.status,
            date: order?.created_at ? formatDateShort(order.created_at) : '—',
            product: b.product,
            qty: b.qty,
            progress: b.progress,
            priority: b.priority,
            assignedTo: b.assignedTo || 'Unassigned',
            deadline: formatDateShort(b.deadline ?? null),
            notes: b.notes,
            stages: (b.stages || []).map((s) => ({
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
          setError(t('batchLookup:error'));
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

  const activePage = role === 'owner' ? 'owner-dashboard' : 'batch-lookup';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('batchLookup:title')} />
        <div className="loading-state">{t('batchLookup:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('batchLookup:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={t('batchLookup:title')} />
      <section className="table-wrap">
        <div className="table-head">
          <div className="actions-inline" style={{ flex: 1 }}>
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder={t('batchLookup:searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>{t('common:filter.status')}</label>
                    <select className="select">
                      <option value="">{t('common:filter.allStatus')}</option>
                      <option>{t('batchLookup:filter.active')}</option>
                      <option>{t('batchLookup:filter.completed')}</option>
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>{t('common:filter.apply')}</button>
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
            {t('batchLookup:export')}
          </button>
        </div>
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('batchLookup:table.batchCode')}</th>
                <th>{t('batchLookup:table.order')}</th>
                <th>{t('batchLookup:table.clientName')}</th>
                <th>{t('batchLookup:table.status')}</th>
                <th>{t('batchLookup:table.date')}</th>
                <th>{t('batchLookup:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} className="no-results">{t('batchLookup:noResults')}</td></tr>
                : filtered.map((b) => (
                  <tr key={b.code}>
                    <td>{b.code}</td>
                    <td>{b.order}</td>
                    <td>{b.client}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{b.date}</td>
                    <td><button className="btn" onClick={() => setSelected(b)}>{t('batchLookup:table.view')}</button></td>
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
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t('batchLookup:modal.title', { code: selected.code })}</h2>
              <button onClick={() => setSelected(null)} style={{ padding: '5px 14px', background: '#2f3640', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{t('batchLookup:modal.close')}</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ fontSize: 13 }}>{t('batchLookup:modal.order', { order: selected.order })} · {selected.date}</p>
                <StatusBadge status={selected.status} />
              </div>

              <h4 style={{ marginBottom: 8 }}>{t('batchLookup:modal.jobDetails')}</h4>
              <div className="form-grid-2" style={{ fontSize: 13, gap: 6, marginBottom: 14 }}>
                <p><strong>{t('batchLookup:modal.client')}:</strong> {selected.client}</p>
                <p><strong>{t('batchLookup:modal.product')}:</strong> {selected.product}</p>
                <p><strong>{t('batchLookup:modal.quantity')}:</strong> {selected.qty} {t('batchLookup:modal.pcs')}</p>
                <p><strong>{t('batchLookup:modal.priority')}:</strong> {selected.priority}</p>
                <p><strong>{t('batchLookup:modal.deadline')}:</strong> {selected.deadline}</p>
                <p><strong>{t('batchLookup:modal.assignedTo')}:</strong> {selected.assignedTo}</p>
                {selected.notes && <p style={{ gridColumn: '1 / -1' }}><strong>{t('batchLookup:modal.notes')}:</strong> {selected.notes}</p>}
              </div>

              <div className="line" />

              <h4 style={{ margin: '12px 0 8px' }}>{t('batchLookup:modal.progress')}</h4>
              <ProgressBar percent={pct(selected)} color={pct(selected) === 100 ? 'green' : pct(selected) >= 50 ? 'orange' : undefined} />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 14 }}>
                {selected.progress} / {selected.qty} {t('batchLookup:modal.printed')} ({pct(selected)}%)
              </p>

              <table style={{ marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th>{t('batchLookup:modal.stages.stage')}</th>
                    <th>{t('batchLookup:modal.stages.status')}</th>
                    <th>{t('batchLookup:modal.stages.updatedAt')}</th>
                  </tr>
                </thead>
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

              <h4 style={{ margin: '12px 0 8px' }}>{t('batchLookup:modal.clientInfo')}</h4>
              <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                <p><strong>{selected.client}</strong></p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.address}</p>
                <p style={{ color: 'var(--muted)' }}>{selected.clientInfo.phone}</p>
                <p style={{ color: 'var(--muted)' }}>{t('batchLookup:modal.taxId')}: {selected.clientInfo.taxId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

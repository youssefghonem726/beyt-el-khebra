import React, { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import {
  getUnpricedQueue,
  submitQuoteForOrder,
  updateOrder,
} from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import {
  getDefaultPricing,
  type PricingRow,
} from '../../lib/api/pricingService';

type PricingKey = Exclude<keyof PricingRow, 'id' | 'created_at' | 'user' | 'source'>;

const PRICING_OPTIONS: Array<{ key: PricingKey; label: string }> = [
  { key: 'front', label: 'Front' },
  { key: 'front_and_back', label: 'Front & Back' },
  { key: 'digital_cover_300g', label: 'Digital Cover 300g' },
  { key: 'digital_cover_200g', label: 'Digital Cover 200g' },
  { key: 'offset_cover_200g', label: 'Offset Cover 200g' },
  { key: 'offset_cover_300g', label: 'Offset Cover 300g' },
  { key: 'coil_size_10', label: 'Coil Size 10' },
  { key: 'coil_size_12', label: 'Coil Size 12' },
  { key: 'coil_size_14', label: 'Coil Size 14' },
  { key: 'coil_size_16', label: 'Coil Size 16' },
  { key: 'coil_size_18', label: 'Coil Size 18' },
  { key: 'coil_size_20', label: 'Coil Size 20' },
  { key: 'coil_size_22', label: 'Coil Size 22' },
  { key: 'coil_size_25', label: 'Coil Size 25' },
  { key: 'coil_size_28', label: 'Coil Size 28' },
  { key: 'coil_size_30', label: 'Coil Size 30' },
  { key: 'coil_size_32', label: 'Coil Size 32' },
  { key: 'coil_size_35', label: 'Coil Size 35' },
];

const GROUPED_KEYS = {
  front: ['front', 'front_and_back'] as PricingKey[],
  cover: [
    'digital_cover_300g',
    'digital_cover_200g',
    'offset_cover_200g',
    'offset_cover_300g',
  ] as PricingKey[],
  coil: [
    'coil_size_10',
    'coil_size_12',
    'coil_size_14',
    'coil_size_16',
    'coil_size_18',
    'coil_size_20',
    'coil_size_22',
    'coil_size_25',
    'coil_size_28',
    'coil_size_30',
    'coil_size_32',
    'coil_size_35',
  ] as PricingKey[],
};

// ─── Helper: determine which pricing groups are relevant for a set of items ───
const getRelevantGroups = (items: UnpricedItem[]) => {
  let showFront = false;
  let showCover = false;
  let showCoil = false;

  for (const item of items) {
    if (item.print_type != null && item.print_type !== '') showFront = true;
    if (item.cover != null && item.cover !== '') showCover = true;
    if (item.binding != null && item.binding !== '') showCover = true;
    if (item.binding && (item.binding.toLowerCase().includes('spiral') || item.binding.toLowerCase().includes('coil'))) showCoil = true;
    if (item.coil != null && item.coil !== '') showCoil = true;
  }

  return { showFront, showCover, showCoil };
};

// ─── Round to 2 decimal places (fixes 400 error on too many digits) ─────────
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ─── Item type → relevant spec fields (matching PlaceNewOrder forms) ──────────
const ITEM_SPEC_MAP: Record<string, { key: keyof UnpricedItem; labelKey: string }[]> = {
  book: [
    { key: 'size', labelKey: 'unpricedQueue:pricing.itemSpecs.size' },
    { key: 'color_mode', labelKey: 'unpricedQueue:pricing.itemSpecs.color' },
    { key: 'cover', labelKey: 'unpricedQueue:pricing.itemSpecs.cover' },
    { key: 'binding', labelKey: 'unpricedQueue:pricing.itemSpecs.binding' },
    { key: 'print_type', labelKey: 'unpricedQueue:pricing.itemSpecs.printType' },
  ],
  booklet: [
    { key: 'size', labelKey: 'unpricedQueue:pricing.itemSpecs.size' },
    { key: 'paper', labelKey: 'unpricedQueue:pricing.itemSpecs.paper' },
    { key: 'color_mode', labelKey: 'unpricedQueue:pricing.itemSpecs.color' },
    { key: 'binding', labelKey: 'unpricedQueue:pricing.itemSpecs.binding' },
    { key: 'print_type', labelKey: 'unpricedQueue:pricing.itemSpecs.printType' },
  ],
  card: [
    { key: 'size', labelKey: 'unpricedQueue:pricing.itemSpecs.size' },
    { key: 'paper', labelKey: 'unpricedQueue:pricing.itemSpecs.paper' },
    { key: 'finish', labelKey: 'unpricedQueue:pricing.itemSpecs.finish' },
    { key: 'print_type', labelKey: 'unpricedQueue:pricing.itemSpecs.printType' },
  ],
  sticker: [
    { key: 'material', labelKey: 'unpricedQueue:pricing.itemSpecs.material' },
    { key: 'shape', labelKey: 'unpricedQueue:pricing.itemSpecs.shape' },
    { key: 'finish', labelKey: 'unpricedQueue:pricing.itemSpecs.finish' },
  ],
  poster: [
    { key: 'size', labelKey: 'unpricedQueue:pricing.itemSpecs.size' },
    { key: 'paper', labelKey: 'unpricedQueue:pricing.itemSpecs.paper' },
    { key: 'finish', labelKey: 'unpricedQueue:pricing.itemSpecs.finish' },
    { key: 'print_type', labelKey: 'unpricedQueue:pricing.itemSpecs.printType' },
  ],
};

const getItemSpecs = (item: UnpricedItem, t: (key: string, options?: any) => string) => {
  const typeMapping = ITEM_SPEC_MAP[item.item_type?.toLowerCase() ?? ''];
  const allFields: { label: string; value: string }[] = [];

  if (typeMapping) {
    typeMapping.forEach(({ key, labelKey }) => {
      const val = item[key] as string | number | null;
      if (val !== null && val !== undefined && val !== '') {
        const translated = t(labelKey);
        const displayLabel = translated === labelKey
          ? key.replace(/_/g, ' ')
          : translated;
        allFields.push({ label: displayLabel, value: String(val) });
      }
    });
  } else {
    const genericFields: (keyof UnpricedItem)[] = [
      'size', 'paper', 'material', 'color_mode', 'cover', 'binding', 'coil',
      'finish', 'shape', 'print_type', 'page_count', 'pages'
    ];
    genericFields.forEach(key => {
      const val = item[key] as string | number | null;
      if (val !== null && val !== undefined && val !== '') {
        allFields.push({ label: key.replace(/_/g, ' '), value: String(val) });
      }
    });
  }

  return allFields;
};

interface UnpricedItem {
  id: number | string;
  item_type: string;
  quantity: number;
  notes?: string | null;
  due_date?: string | null;
  page_count?: number | string | null;
  pages?: number | string | null;
  size?: string | null;
  paper?: string | null;
  material?: string | null;
  color_mode?: string | null;
  cover?: string | null;
  binding?: string | null;
  coil?: string | null;
  finish?: string | null;
  shape?: string | null;
  print_type?: string | null;
  file?: { id: number; file_name?: string | null; url?: string | null } | null;
  cover_file?: { id: number; file_name?: string | null; url?: string | null } | null;
}

interface UnpricedJob {
  id: number;
  displayId: string;
  client: string;
  clientEmail: string;
  product: string;
  items: UnpricedItem[];
  qty: number;
  deadline: string;
  dueDate: string | null;
  createdAt: string | null;
  notes?: string | null;
  uploadLabel?: string | null;
}

interface PricingState {
  unitPrice: string;
  vatRate: string;
  notes: string;
}

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const resolveFileUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

function formatDate(isoDate: string | null, lang: string, fallback: string): string {
  if (!isoDate) return fallback;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getShortOrderId(id: number | string): string {
  const num = typeof id === 'number' ? id : parseInt(id, 10);
  return Number.isNaN(num) ? `#${id}` : `#${num}`;
}

function getProductFallback(order: any): string {
  return order.product_summary || order.upload?.file_name || `Order #${order.id}`;
}

function showValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function getUploadedFileLabel(order: any): string | null {
  if (Array.isArray(order.item_details)) {
    const names = order.item_details
      .flatMap((item: any) => [item.file, item.cover_file])
      .filter(Boolean)
      .map((file: any) => file.file_name || file.url?.split('/').pop() || `File #${file.id}`);
    if (names.length) return names.join(', ');
  }
  if (order.upload?.file_name) return order.upload.file_name;
  if (order.upload?.name) return order.upload.name;
  if (order.file?.file_name) return order.file.file_name;
  if (order.upload) return `Upload #${order.upload}`;
  return null;
}

export default function UnpricedQueue() {
  return (
    <Suspense fallback={null}>
      <UnpricedQueueInner />
    </Suspense>
  );
}

function UnpricedQueueInner() {
  const { t, i18n } = useTranslation(['common', 'unpricedQueue']);

  const [jobs, setJobs] = useState<UnpricedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingState>({
    unitPrice: '',
    vatRate: '14',
    notes: '',
  });
  const [selectedFront, setSelectedFront] = useState<PricingKey | ''>('');
  const [selectedCover, setSelectedCover] = useState<PricingKey | ''>('');
  const [selectedCoil, setSelectedCoil] = useState<PricingKey | ''>('');
  const [customPriceMode, setCustomPriceMode] = useState(false);
  const [pricingTable, setPricingTable] = useState<PricingRow | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, clientsRes, pricingRes] = await Promise.all([
        getUnpricedQueue(),
        getClients(),
        getDefaultPricing().catch(() => null),
      ]);
      setPricingTable(pricingRes?.data?.data ?? null);

      const orders = ordersRes.data.data;
      const clients = clientsRes.data.data.results;
      const clientsMap = new Map(
        clients.map((c: any) => {
          const name =
            `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.name || c.email;
          return [String(c.id), { name, email: c.email ?? '' }];
        })
      );

      const jobList: UnpricedJob[] = orders.map((order: any) => {
        const items = Array.isArray(order.item_details) ? order.item_details : [];
        const qty = items.length
          ? items.reduce(
              (sum: number, item: any) => sum + (Number(item.quantity) || 1),
              0
            )
          : order.quantity ?? order.item_count ?? 0;
        const deadlineIso = order.due_date ?? null;
        const mappedClient = clientsMap.get(String(order.customer));
        const clientName =
          order.customer_name ||
          mappedClient?.name ||
          order.customer_email ||
          'Unknown';

        return {
          id: order.id,
          displayId: getShortOrderId(order.id),
          client: clientName,
          clientEmail:
            order.customer_email ||
            mappedClient?.email ||
            t('unpricedQueue:notProvided'),
          product: getProductFallback(order),
          items: items.map((item: any) => ({
            id: item.id,
            item_type: item.item_type || 'Item',
            quantity: Number(item.quantity) || 1,
            notes: item.notes ?? null,
            due_date: item.due_date ?? null,
            page_count: item.page_count ?? null,
            pages: item.pages ?? null,
            size: item.size ?? null,
            paper: item.paper ?? null,
            material: item.material ?? null,
            color_mode: item.color_mode ?? null,
            cover: item.cover ?? null,
            binding: item.binding ?? null,
            coil: item.coil ?? null,
            finish: item.finish ?? null,
            shape: item.shape ?? null,
            print_type: item.print_type ?? null,
            file: item.file ?? null,
            cover_file: item.cover_file ?? null,
          })),
          qty,
          deadline: formatDate(
            deadlineIso,
            i18n.language,
            t('unpricedQueue:notProvided')
          ),
          dueDate: deadlineIso,
          createdAt: order.created_at ?? null,
          notes: order.notes ?? null,
          uploadLabel: getUploadedFileLabel(order),
        };
      });

      setJobs(jobList);
    } catch (err) {
      console.error('Failed to load unpriced queue:', err);
      setError(t('unpricedQueue:error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPricing = (id: number) => {
    setPricingId(prev => (prev === String(id) ? null : String(id)));
    setPricing({ unitPrice: '', vatRate: '14', notes: '' });
    setSelectedFront('');
    setSelectedCover('');
    setSelectedCoil('');
    setCustomPriceMode(false);
  };

  const cancelOrder = async (job: UnpricedJob) => {
    const confirmed = window.confirm(
      t('unpricedQueue:cancelConfirm', { id: job.displayId })
    );
    if (!confirmed) return;

    setCancellingId(String(job.id));
    setError(null);
    try {
      await updateOrder(job.id, { status: 'CANCELLED' });
      if (pricingId === String(job.id)) setPricingId(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(t('unpricedQueue:cancelError'));
    } finally {
      setCancellingId(null);
    }
  };

  // Compute unit price: sum of selected prices from each RELEVANT group
  const computeUnitPrice = (relevantGroups: { showFront: boolean; showCover: boolean; showCoil: boolean }): number => {
    if (customPriceMode) return parseFloat(pricing.unitPrice) || 0;
    if (!pricingTable) return 0;
    let sum = 0;
    if (relevantGroups.showFront && selectedFront && pricingTable[selectedFront] != null)
      sum += Number(pricingTable[selectedFront]);
    if (relevantGroups.showCover && selectedCover && pricingTable[selectedCover] != null)
      sum += Number(pricingTable[selectedCover]);
    if (relevantGroups.showCoil && selectedCoil && pricingTable[selectedCoil] != null)
      sum += Number(pricingTable[selectedCoil]);
    return sum;
  };

  const submitPrice = async (job: UnpricedJob) => {
    const relevantGroups = getRelevantGroups(job.items);
    const currentUnitPrice = computeUnitPrice(relevantGroups);
    if (currentUnitPrice <= 0) return;

    const vat = parseFloat(pricing.vatRate) / 100 || 0;

    // Round all monetary values to 2 decimals to avoid validation errors
    const unit = round2(currentUnitPrice);
    const total = round2(job.qty * unit * (1 + vat));

    const quoteItems = job.items.length
      ? job.items.map((item) => {
          const itemQty = item.quantity || 1;
          const itemTotal = round2(itemQty * unit * (1 + vat));
          return {
            item_type: item.item_type,
            quantity: itemQty,
            estimated_unit_price: unit,
            estimated_total_price: itemTotal,
            notes: pricing.notes || item.notes || '',
          };
        })
      : [
          {
            item_type: job.product,
            quantity: job.qty || 1,
            estimated_unit_price: unit,
            estimated_total_price: total,
            notes: pricing.notes,
          },
        ];

    // Debug logging – can be removed after verification
    console.log('Submitting quote payload:', {
      order_id: job.id,
      status: 'pending',
      total_estimated_price: total,
      notes: pricing.notes,
      items: quoteItems,
    });

    setSubmittingId(String(job.id));
    setError(null);
    try {
      await submitQuoteForOrder(job.id, {
        order_id: job.id,
        status: 'pending',
        total_estimated_price: total,
        notes: pricing.notes,
        items: quoteItems,
      });

      setPricingId(null);
      setPricing({ unitPrice: '', vatRate: '14', notes: '' });
      setSelectedFront('');
      setSelectedCover('');
      setSelectedCoil('');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to submit quote:', err);
      if (err?.response?.data) {
        console.error('Server response:', JSON.stringify(err.response.data, null, 2));
      }
      setError(t('unpricedQueue:submitError'));
    } finally {
      setSubmittingId(null);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString(
      i18n.language === 'ar' ? 'ar-EG' : 'en-EG',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );

  const now = new Date();
  const dueSoon = jobs.filter((job) => {
    if (!job.dueDate) return false;
    const dueDate = new Date(job.dueDate);
    const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }).length;
  const overdue = jobs.filter((job) => {
    if (!job.dueDate) return false;
    return new Date(job.dueDate).getTime() < now.getTime();
  }).length;
  const averageProcessingDays = jobs.length
    ? jobs.reduce((sum, job) => {
        if (!job.createdAt) return sum;
        const createdAt = new Date(job.createdAt);
        if (Number.isNaN(createdAt.getTime())) return sum;
        return (
          sum +
          Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        );
      }, 0) / jobs.length
    : 0;

  const shell = (children: ReactNode) => (
    <AppShell role="owner" activePage="unpriced-queue">
      <Topbar title={t('unpricedQueue:title')} />
      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard
          label={t('unpricedQueue:stats.totalUnpriced')}
          value={jobs.length}
          sub={t('unpricedQueue:stats.totalSub')}
        />
        <StatCard
          label={t('unpricedQueue:stats.dueSoon')}
          value={dueSoon}
          sub={t('unpricedQueue:stats.dueSoonSub')}
        />
        <StatCard
          label={t('unpricedQueue:stats.overdue')}
          value={overdue}
          sub={
            overdue === 0
              ? t('unpricedQueue:stats.overdueNone')
              : t('unpricedQueue:stats.overdueSome')
          }
        />
        <StatCard
          label={t('unpricedQueue:stats.avgProcessing')}
          value={`${averageProcessingDays.toFixed(1)}d`}
          sub={t('unpricedQueue:stats.avgSub')}
        />
      </section>
      {children}
    </AppShell>
  );

  if (loading) return shell(<div className="loading-state">{t('unpricedQueue:loading')}</div>);
  if (error) return shell(<div className="error-state">{error}</div>);

  return shell(
    <section className="table-wrap">
      <div className="table-head">
        <h3>{t('unpricedQueue:table.title')}</h3>
      </div>

      {jobs.length === 0 && (
        <p className="muted" style={{ padding: '20px 0' }}>
          {t('unpricedQueue:table.empty')}
        </p>
      )}

      <div className="stack">
        {jobs.map((j) => {
          const isOpen = pricingId === String(j.id);
          const relevantGroups = getRelevantGroups(j.items);
          const currentUnitPrice = computeUnitPrice(relevantGroups);
          const currentVatRate = parseFloat(pricing.vatRate) / 100 || 0;
          const currentSubtotal = currentUnitPrice * j.qty;
          const currentVat = currentSubtotal * currentVatRate;
          const currentTotal = currentSubtotal + currentVat;

          return (
            <article key={j.id} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <h4>{j.displayId}</h4>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: '#fef3cd',
                    color: '#856404',
                    fontWeight: 600,
                  }}
                >
                  {t('unpricedQueue:job.badge')}
                </span>
              </div>
              <p style={{ marginBottom: 2 }}>
                <strong>{t('unpricedQueue:job.client')}:</strong> {j.client}
              </p>
              {j.items.length <= 1 ? (
                <p style={{ marginBottom: 2 }}>
                  <strong>{t('unpricedQueue:job.product')}:</strong>{' '}
                  {j.items[0]
                    ? `${j.items[0].item_type} (${t('unpricedQueue:job.pcs', {
                        count: j.items[0].quantity,
                      })})`
                    : j.product}
                </p>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ marginBottom: 4 }}>
                    <strong>{t('unpricedQueue:job.products')}:</strong>
                  </p>
                  <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                    {j.items.map((item) => (
                      <li key={item.id}>
                        {item.item_type} -{' '}
                        {t('unpricedQueue:job.pcs', { count: item.quantity })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ marginBottom: 2 }}>
                <strong>{t('unpricedQueue:job.quantity')}:</strong>{' '}
                {t('unpricedQueue:job.pcs', { count: j.qty })}
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>{t('unpricedQueue:job.deadline')}:</strong> {j.deadline}
              </p>

              <div className="card-actions">
                <button
                  className={`btn${isOpen ? ' primary' : ''}`}
                  onClick={() => openPricing(j.id)}
                >
                  {isOpen
                    ? t('unpricedQueue:pricing.cancel')
                    : t('unpricedQueue:pricing.priceThisJob')}
                </button>
                <button
                  className="btn danger"
                  onClick={() => cancelOrder(j)}
                  disabled={
                    cancellingId === String(j.id) || submittingId === String(j.id)
                  }
                >
                  {cancellingId === String(j.id)
                    ? t('unpricedQueue:job.cancelling')
                    : t('unpricedQueue:job.cancelOrder')}
                </button>
              </div>

              {isOpen && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '16px',
                    background: 'var(--surface-2, #f8f9fb)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <h4 style={{ marginBottom: 14, fontSize: 14 }}>
                    {t('unpricedQueue:pricing.panelTitle', {
                      id: j.displayId,
                    })}
                  </h4>

                  <div className="table-responsive" style={{ marginBottom: 14 }}>
                    <table className="orders-table">
                      <tbody>
                        <tr>
                          <th>{t('unpricedQueue:pricing.details.orderId')}</th>
                          <td>{j.displayId}</td>
                          <th>{t('unpricedQueue:pricing.details.client')}</th>
                          <td>{j.client}</td>
                        </tr>
                        <tr>
                          <th>{t('unpricedQueue:pricing.details.email')}</th>
                          <td>{j.clientEmail}</td>
                          <th>{t('unpricedQueue:pricing.details.dueDate')}</th>
                          <td>{j.deadline}</td>
                        </tr>
                        <tr>
                          <th>
                            {t('unpricedQueue:pricing.details.uploadedFiles')}
                          </th>
                          <td>
                            {showValue(
                              j.uploadLabel,
                              t('unpricedQueue:notProvided')
                            )}
                          </td>
                          <th>
                            {t('unpricedQueue:pricing.details.orderNotes')}
                          </th>
                          <td>
                            {showValue(j.notes, t('unpricedQueue:notProvided'))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: 10, fontSize: 14 }}>
                    {t('unpricedQueue:pricing.itemsToPrice')}
                  </h4>

                  {j.items.length === 0 ? (
                    <p style={{ marginBottom: 16 }} className="muted">
                      {j.product} – {t('unpricedQueue:job.pcs', { count: j.qty || 1 })}
                    </p>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      {j.items.map((item) => {
                        const specs = getItemSpecs(item, t);
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: '10px 14px',
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {item.item_type} × {item.quantity}
                            </div>
                            {specs.length > 0 ? (
                              <div style={{ fontSize: 13 }}>
                                {specs.map((spec, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 2 }}>
                                    <span style={{ color: 'var(--muted)', minWidth: 80 }}>{spec.label}</span>
                                    <span>{spec.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="muted">
                                {t('unpricedQueue:pricing.notProvided')}
                              </span>
                            )}
                            {[item.file, item.cover_file].filter(Boolean).length > 0 && (
                              <div style={{ marginTop: 8, fontSize: 13 }}>
                                <strong>{t('unpricedQueue:pricing.itemCols.files')}:</strong>{' '}
                                {[item.file, item.cover_file]
                                  .filter(Boolean)
                                  .map((file: any) =>
                                    file.url ? (
                                      <a
                                        key={file.id}
                                        href={resolveFileUrl(file.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ marginRight: 8 }}
                                      >
                                        {file.file_name || `File #${file.id}`}
                                      </a>
                                    ) : (
                                      <span key={file.id} style={{ marginRight: 8 }}>
                                        {file.file_name || `File #${file.id}`}
                                      </span>
                                    )
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: 14 }}>
                      {t('unpricedQueue:pricing.setPrice', {
                        id: j.displayId,
                      })}
                    </h4>
                    {pricingTable && (
                      <button
                        className={`btn${customPriceMode ? ' primary' : ''}`}
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => {
                          setCustomPriceMode((v) => !v);
                          setPricing((p) => ({ ...p, unitPrice: '' }));
                          setSelectedFront('');
                          setSelectedCover('');
                          setSelectedCoil('');
                        }}
                      >
                        {t('unpricedQueue:pricing.customPriceBtn')}
                      </button>
                    )}
                  </div>

                  {!customPriceMode && pricingTable && (
                    <>
                      {relevantGroups.showFront && (
                        <div style={{ marginBottom: 12 }}>
                          <h5 style={{ marginBottom: 8, fontSize: 13 }}>
                            {t('unpricedQueue:pricing.group.front', 'Print Side')}
                          </h5>
                          <table className="orders-table">
                            <thead>
                              <tr>
                                <th>{t('unpricedQueue:pricing.table.option', 'Option')}</th>
                                <th>{t('unpricedQueue:pricing.table.price', 'Price (EGP)')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {GROUPED_KEYS.front.map((key) => {
                                const price = Number(pricingTable[key]) || 0;
                                const isSelected = selectedFront === key;
                                return (
                                  <tr
                                    key={key}
                                    onClick={() => setSelectedFront(key)}
                                    style={{
                                      cursor: 'pointer',
                                      backgroundColor: isSelected
                                        ? 'var(--surface-3, #e8f0fe)'
                                        : 'transparent',
                                      transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'var(--surface-2, #f5f5f5)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'transparent';
                                    }}
                                  >
                                    <td style={{ fontWeight: isSelected ? 600 : 400 }}>
                                      {PRICING_OPTIONS.find((o) => o.key === key)?.label || key}
                                    </td>
                                    <td>
                                      <span>{fmt(price)}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {relevantGroups.showCover && (
                        <div style={{ marginBottom: 12 }}>
                          <h5 style={{ marginBottom: 8, fontSize: 13 }}>
                            {t('unpricedQueue:pricing.group.cover', 'Cover Options')}
                          </h5>
                          <table className="orders-table">
                            <thead>
                              <tr>
                                <th>{t('unpricedQueue:pricing.table.option', 'Option')}</th>
                                <th>{t('unpricedQueue:pricing.table.price', 'Price (EGP)')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {GROUPED_KEYS.cover.map((key) => {
                                const price = Number(pricingTable[key]) || 0;
                                const isSelected = selectedCover === key;
                                return (
                                  <tr
                                    key={key}
                                    onClick={() => setSelectedCover(key)}
                                    style={{
                                      cursor: 'pointer',
                                      backgroundColor: isSelected
                                        ? 'var(--surface-3, #e8f0fe)'
                                        : 'transparent',
                                      transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'var(--surface-2, #f5f5f5)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'transparent';
                                    }}
                                  >
                                    <td style={{ fontWeight: isSelected ? 600 : 400 }}>
                                      {PRICING_OPTIONS.find((o) => o.key === key)?.label || key}
                                    </td>
                                    <td>
                                      <span>{fmt(price)}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {relevantGroups.showCoil && (
                        <div style={{ marginBottom: 12 }}>
                          <h5 style={{ marginBottom: 8, fontSize: 13 }}>
                            {t('unpricedQueue:pricing.group.coil', 'Coil Size Options')}
                          </h5>
                          <table className="orders-table">
                            <thead>
                              <tr>
                                <th>{t('unpricedQueue:pricing.table.option', 'Option')}</th>
                                <th>{t('unpricedQueue:pricing.table.price', 'Price (EGP)')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {GROUPED_KEYS.coil.map((key) => {
                                const price = Number(pricingTable[key]) || 0;
                                const isSelected = selectedCoil === key;
                                return (
                                  <tr
                                    key={key}
                                    onClick={() => setSelectedCoil(key)}
                                    style={{
                                      cursor: 'pointer',
                                      backgroundColor: isSelected
                                        ? 'var(--surface-3, #e8f0fe)'
                                        : 'transparent',
                                      transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'var(--surface-2, #f5f5f5)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected)
                                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                          'transparent';
                                    }}
                                  >
                                    <td style={{ fontWeight: isSelected ? 600 : 400 }}>
                                      {PRICING_OPTIONS.find((o) => o.key === key)?.label || key}
                                    </td>
                                    <td>
                                      <span>{fmt(price)}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {customPriceMode && (
                    <div className="field" style={{ margin: '0 0 12px' }}>
                      <label>{t('unpricedQueue:pricing.unitPrice')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t(
                          'unpricedQueue:pricing.unitPricePlaceholder'
                        )}
                        value={pricing.unitPrice}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            unitPrice: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  {!customPriceMode && pricingTable && currentUnitPrice > 0 && (
                    <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                      {t('unpricedQueue:pricing.unitPriceLabel', 'Unit Price')}: EGP {fmt(currentUnitPrice)}
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 12px' }}>
                    <label>{t('unpricedQueue:pricing.vatRate')}</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder={t('unpricedQueue:pricing.vatPlaceholder')}
                      value={pricing.vatRate}
                      onChange={(e) =>
                        setPricing((p) => ({
                          ...p,
                          vatRate: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {currentUnitPrice > 0 && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: '10px 14px',
                        background: '#fff',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span className="muted">
                          {t('unpricedQueue:pricing.subtotal', {
                            qty: j.qty,
                            price: fmt(currentUnitPrice),
                          })}
                        </span>
                        <span>EGP {fmt(currentSubtotal)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span className="muted">
                          {t('unpricedQueue:pricing.vat', {
                            rate: pricing.vatRate,
                          })}
                        </span>
                        <span>EGP {fmt(currentVat)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 700,
                        }}
                      >
                        <span>{t('unpricedQueue:pricing.total')}</span>
                        <span>EGP {fmt(currentTotal)}</span>
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ margin: '0 0 14px' }}>
                    <label>{t('unpricedQueue:pricing.notes')}</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, resize: 'vertical' }}
                      placeholder={t('unpricedQueue:pricing.notesPlaceholder')}
                      value={pricing.notes}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, notes: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn primary"
                      disabled={
                        currentUnitPrice <= 0 ||
                        submittingId === String(j.id) ||
                        cancellingId === String(j.id)
                      }
                      onClick={() => submitPrice(j)}
                    >
                      {submittingId === String(j.id)
                        ? t('unpricedQueue:pricing.submitting')
                        : t('unpricedQueue:pricing.submit')}
                    </button>
                    <button
                      className="btn"
                      onClick={() => setPricingId(null)}
                      disabled={submittingId === String(j.id)}
                    >
                      {t('unpricedQueue:pricing.cancel')}
                    </button>
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
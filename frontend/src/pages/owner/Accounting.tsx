import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import SearchFilter from '../../components/SearchFilter';
import ClientSummary from '../../components/ClientSummary';
import { downloadText } from '../../utils/download';
import { generateInvoice, getAccountingOverview, payInvoice } from '../../lib/api/invoicesService';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

interface InvoiceItem {
  id: number;
  item_type: string;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
}

interface DisplayInvoice {
  id: string;
  order: string;
  client: string;
  total: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  totalAmountValue: number;
  paidAmountValue: number;
  remainingAmountValue: number;
  createdAt?: string;
  itemSummary: string;
  items: InvoiceItem[];
}

interface InvoiceCandidate {
  order_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  status?: string;
}

function formatAmount(amount: number | null | undefined, lang: string): string {
  if (amount === null || amount === undefined) return '-';
  return `EGP ${amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLarge(num: number): string {
  if (num >= 1_000_000) return `EGP ${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `EGP ${(num / 1_000).toFixed(0)}K`;
  return `EGP ${num.toFixed(0)}`;
}

function getShortOrderId(orderId: number | string | null | undefined): string {
  if (orderId === null || orderId === undefined) return '-';
  return `#${orderId}`;
}

function formatDate(value: string | undefined, lang: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildInvoiceLines(invoice: DisplayInvoice, t: TFn, lang: string): string[] {
  return [
    `${t('accounting:download.invoice')}: ${invoice.id}`,
    `${t('accounting:download.order')}: ${invoice.order}`,
    `${t('accounting:download.client')}: ${invoice.client}`,
    `${t('accounting:download.date')}: ${formatDate(invoice.createdAt, lang)}`,
    `${t('accounting:download.items')}: ${invoice.itemSummary}`,
    `${t('accounting:download.total')}: ${invoice.total}`,
    `${t('accounting:download.paid')}: ${invoice.paidAmount}`,
    `${t('accounting:download.remaining')}: ${invoice.remainingAmount}`,
    `${t('accounting:download.paymentStatus')}: ${invoice.status}`,
  ];
}

export default function Accounting() {
  return (
    <Suspense fallback={null}>
      <AccountingInner />
    </Suspense>
  );
}

function AccountingInner() {
  const { t, i18n } = useTranslation(['common', 'accounting']);

  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<DisplayInvoice[]>([]);
  const [invoiceCandidates, setInvoiceCandidates] = useState<InvoiceCandidate[]>([]);
  const [stats, setStats] = useState<{ labelKey: string; value: string | number; subKey: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<DisplayInvoice | null>(null);
  const [partialInvoice, setPartialInvoice] = useState<DisplayInvoice | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialError, setPartialError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const overviewRes = await getAccountingOverview();
      const overview = overviewRes.data.data;

      const displayList: DisplayInvoice[] = (overview.invoices ?? []).map((inv: any) => {
        const totalAmountValue = Number(inv.total ?? inv.total_amount ?? 0);
        const paidAmountValue = Number(inv.paid_amount ?? 0);
        const remainingAmountValue = Number(inv.remaining_amount ?? Math.max(totalAmountValue - paidAmountValue, 0));

        return {
          id: String(inv.id),
          order: getShortOrderId(inv.orderId ?? inv.order_id ?? inv.order),
          client: inv.client_name || 'Unknown',
          total: formatAmount(totalAmountValue, i18n.language),
          paidAmount: formatAmount(paidAmountValue, i18n.language),
          remainingAmount: formatAmount(remainingAmountValue, i18n.language),
          status: inv.payment_status || 'unpaid',
          totalAmountValue,
          paidAmountValue,
          remainingAmountValue,
          createdAt: inv.created_at,
          itemSummary: inv.item_summary || getShortOrderId(inv.orderId ?? inv.order_id ?? inv.order),
          items: inv.items ?? [],
        };
      });

      setStats([
        { labelKey: 'revenueSnapshot', value: formatLarge(overview.stats?.revenue_snapshot ?? 0), subKey: 'revenueSnapshotSub' },
        { labelKey: 'pendingCollection', value: formatLarge(overview.stats?.pending_collection ?? 0), subKey: 'pendingCollectionSub' },
        { labelKey: 'paidOrders', value: overview.stats?.paid_orders ?? 0, subKey: 'paidOrdersSub' },
        { labelKey: 'unpaidOrders', value: overview.stats?.unpaid_orders ?? 0, subKey: 'unpaidOrdersSub' },
      ]);

      setInvoices(displayList);
      setFilteredInvoices(displayList);
      setInvoiceCandidates(overview.invoice_candidates ?? []);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      setError(t('accounting:error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (query: string, filter: string) => {
    let result = invoices;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(inv =>
        inv.id.toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        inv.order.toLowerCase().includes(q) ||
        inv.itemSummary.toLowerCase().includes(q)
      );
    }

    if (filter) {
      result = result.filter(inv => inv.status.toLowerCase() === filter.toLowerCase());
    }

    setFilteredInvoices(result);
  };

  const handleGenerateInvoice = async (orderId: number) => {
    setSavingId(`order-${orderId}`);
    try {
      await generateInvoice(orderId);
      await fetchData();
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      setError(t('accounting:generateError'));
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setSavingId(invoiceId);
    try {
      await payInvoice(invoiceId, { mark_full: true });
      await fetchData();
    } catch (err) {
      console.error('Failed to mark invoice paid:', err);
      setError(t('accounting:markPaidError'));
    } finally {
      setSavingId(null);
    }
  };

  const openPartialPayment = (invoice: DisplayInvoice) => {
    setPartialInvoice(invoice);
    setPartialAmount('');
    setPartialError(null);
  };

  const handlePartialPaymentSubmit = async () => {
    if (!partialInvoice) return;

    const amount = Number(partialAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPartialError(t('accounting:partial.errorZero'));
      return;
    }

    if (amount > partialInvoice.remainingAmountValue) {
      setPartialError(t('accounting:partial.errorExceed'));
      return;
    }

    setSavingId(partialInvoice.id);
    try {
      await payInvoice(partialInvoice.id, { amount, mark_full: false });
      setPartialInvoice(null);
      setPartialAmount('');
      await fetchData();
    } catch (err) {
      console.error('Failed to record partial payment:', err);
      setPartialError(t('accounting:partial.error'));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="accounting">
        <Topbar title={t('accounting:title')} />
        <section className="grid-4">
          <StatCard label={t('accounting:stats.revenueSnapshot')}   value="..." sub={t('accounting:stats.revenueSnapshotSub')} />
          <StatCard label={t('accounting:stats.pendingCollection')} value="..." sub={t('accounting:stats.pendingCollectionSub')} />
          <StatCard label={t('accounting:stats.paidOrders')}        value="..." sub={t('accounting:stats.paidOrdersSub')} />
          <StatCard label={t('accounting:stats.unpaidOrders')}      value="..." sub={t('accounting:stats.unpaidOrdersSub')} />
        </section>
        <section className="table-wrap">
          <div className="loading-state">{t('accounting:loading')}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="accounting">
      <Topbar title={t('accounting:title')} />

      <section className="grid-4">
        {stats.map((stat, idx) => (
          <StatCard
            key={idx}
            label={t(`accounting:stats.${stat.labelKey}`)}
            value={stat.value}
            sub={t(`accounting:stats.${stat.subKey}`)}
          />
        ))}
      </section>

      {error && <div className="error-state" style={{ marginTop: 12 }}>{error}</div>}

      <ClientSummary invoices={invoices} />

      {invoiceCandidates.length > 0 && (
        <section className="table-wrap">
          <div className="table-head">
            <h3>{t('accounting:candidates.title')}</h3>
          </div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('accounting:candidates.colOrder')}</th>
                <th>{t('accounting:candidates.colClient')}</th>
                <th>{t('accounting:candidates.colTotal')}</th>
                <th>{t('accounting:candidates.colPaid')}</th>
                <th>{t('accounting:candidates.colRemaining')}</th>
                <th>{t('accounting:candidates.colOrderStatus')}</th>
                <th>{t('accounting:candidates.colPayment')}</th>
                <th>{t('accounting:candidates.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {invoiceCandidates.map((order) => (
                <tr key={order.order_id}>
                  <td>{getShortOrderId(order.order_id)}</td>
                  <td>{order.client_name}</td>
                  <td>{formatAmount(order.total, i18n.language)}</td>
                  <td>{formatAmount(order.paid_amount, i18n.language)}</td>
                  <td>{formatAmount(order.remaining_amount, i18n.language)}</td>
                  <td><StatusBadge status={order.status || 'CONFIRMED'} /></td>
                  <td><StatusBadge status={order.payment_status} /></td>
                  <td>
                    <button
                      className="btn"
                      disabled={savingId === `order-${order.order_id}`}
                      onClick={() => handleGenerateInvoice(order.order_id)}
                    >
                      {savingId === `order-${order.order_id}`
                        ? t('accounting:candidates.generating')
                        : t('accounting:candidates.generate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="table-wrap">
        <div className="table-head">
          <h3>{t('accounting:invoices.title')}</h3>
          <SearchFilter
            placeholder={t('accounting:invoices.searchPlaceholder')}
            filters={[
              { label: t('accounting:invoices.filterPaid'),    value: 'paid' },
              { label: t('accounting:invoices.filterPartial'), value: 'partial' },
              { label: t('accounting:invoices.filterUnpaid'),  value: 'unpaid' },
            ]}
            onSearch={handleSearch}
          />
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('accounting:invoices.colInvoice')}</th>
              <th>{t('accounting:invoices.colOrder')}</th>
              <th>{t('accounting:invoices.colClient')}</th>
              <th>{t('accounting:invoices.colItems')}</th>
              <th>{t('accounting:invoices.colTotal')}</th>
              <th>{t('accounting:invoices.colPaid')}</th>
              <th>{t('accounting:invoices.colRemaining')}</th>
              <th>{t('accounting:invoices.colStatus')}</th>
              <th>{t('accounting:invoices.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan={9} className="no-results">{t('accounting:invoices.empty')}</td></tr>
            ) : filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.order}</td>
                <td>{inv.client}</td>
                <td>{inv.itemSummary}</td>
                <td>{inv.total}</td>
                <td>{inv.paidAmount}</td>
                <td>{inv.remainingAmount}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => setPreviewInvoice(inv)}>
                    {t('accounting:invoices.view')}
                  </button>
                  {inv.status !== 'paid' && (
                    <>
                      <button
                        className="btn"
                        disabled={savingId === inv.id}
                        onClick={() => openPartialPayment(inv)}
                      >
                        {t('accounting:invoices.recordPartial')}
                      </button>
                      <button
                        className="btn primary"
                        disabled={savingId === inv.id}
                        onClick={() => handleMarkPaid(inv.id)}
                      >
                        {savingId === inv.id ? t('accounting:invoices.saving') : t('accounting:invoices.markPaid')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previewInvoice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.35)', padding: 18,
        }}>
          <div style={{
            width: '100%', maxWidth: 620,
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)', padding: 22,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{t('accounting:preview.title')}</h3>
              <button className="btn" onClick={() => setPreviewInvoice(null)}>{t('accounting:preview.close')}</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><strong>{t('accounting:preview.invoiceNum')}</strong><br />{previewInvoice.id}</div>
                <div><strong>{t('accounting:preview.order')}</strong><br />{previewInvoice.order}</div>
                <div><strong>{t('accounting:preview.client')}</strong><br />{previewInvoice.client}</div>
                <div><strong>{t('accounting:preview.date')}</strong><br />{formatDate(previewInvoice.createdAt, i18n.language)}</div>
              </div>
              <div>
                <strong>{t('accounting:preview.items')}</strong>
                <div style={{ marginTop: 6 }}>{previewInvoice.itemSummary}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><strong>{t('accounting:preview.total')}</strong><br />{previewInvoice.total}</div>
                <div><strong>{t('accounting:preview.paid')}</strong><br />{previewInvoice.paidAmount}</div>
                <div><strong>{t('accounting:preview.remaining')}</strong><br />{previewInvoice.remainingAmount}</div>
              </div>
              <div>
                <strong>{t('accounting:preview.paymentStatus')}</strong><br />
                <StatusBadge status={previewInvoice.status} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                className="btn"
                onClick={() => downloadText(`invoice-${previewInvoice.id}.txt`, buildInvoiceLines(previewInvoice, t as TFn, i18n.language))}
              >
                {t('accounting:preview.download')}
              </button>
              <button className="btn primary" onClick={() => setPreviewInvoice(null)}>
                {t('accounting:preview.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {partialInvoice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.35)', padding: 18,
        }}>
          <div style={{
            width: '100%', maxWidth: 520,
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)', padding: 22,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{t('accounting:partial.title')}</h3>
              <button className="btn" onClick={() => setPartialInvoice(null)}>{t('accounting:partial.close')}</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><strong>{t('accounting:partial.invoiceNum')}</strong><br />{partialInvoice.id}</div>
              <div><strong>{t('accounting:partial.order')}</strong><br />{partialInvoice.order}</div>
              <div><strong>{t('accounting:partial.client')}</strong><br />{partialInvoice.client}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><strong>{t('accounting:partial.total')}</strong><br />{partialInvoice.total}</div>
                <div><strong>{t('accounting:partial.paid')}</strong><br />{partialInvoice.paidAmount}</div>
                <div><strong>{t('accounting:partial.remaining')}</strong><br />{partialInvoice.remainingAmount}</div>
              </div>
              <label className="form-group">
                <span>{t('accounting:partial.amountLabel')}</span>
                <input
                  className="search-input"
                  style={{ width: '100%' }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={partialAmount}
                  onChange={(event) => {
                    setPartialAmount(event.target.value);
                    setPartialError(null);
                  }}
                  placeholder={t('accounting:partial.amountPlaceholder')}
                />
              </label>
              {partialError && <div className="error-state" style={{ padding: 0 }}>{partialError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn" onClick={() => setPartialInvoice(null)}>
                {t('accounting:partial.cancel')}
              </button>
              <button
                className="btn primary"
                disabled={savingId === partialInvoice.id}
                onClick={handlePartialPaymentSubmit}
              >
                {savingId === partialInvoice.id ? t('accounting:partial.saving') : t('accounting:partial.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

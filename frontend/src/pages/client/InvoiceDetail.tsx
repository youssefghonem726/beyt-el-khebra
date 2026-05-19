import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import './InvoiceDetail.css';
import { openInvoicePdf } from '../../utils/invoicePdf';
import { useNavigation } from '../../context/NavigationContext';
import { getInvoiceById, getClients } from '../../lib/api/invoicesClientsSettingsService';

// ─── Types ────────────────────────────────────────────────────────────
interface InvoiceItem {
  id?: number;
  item_type?: string | null;
  quantity?: number | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
}

interface RawInvoice {
  id: number;
  order_id?: number | null;
  client_id?: number | null;
  client_name?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  total_amount?: number | string | null;
  total?: number | string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  item_summary?: string | null;
  items?: InvoiceItem[];
  notes?: string | null;
}

interface EnrichedInvoice {
  id: string;
  orderId: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  createdAt: string | null;
  dueDate: string | null;
  paidDate: string | null;
  total: number | string | null;
  paid: number | string | null;
  remaining: number | string | null;
  status: string;
  itemSummary: string | null;
  items: InvoiceItem[];
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value: number | string | null | undefined, lang: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `EGP ${num.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Component ────────────────────────────────────────────────────────
export default function InvoiceDetail() {
  return (
    <Suspense fallback={null}>
      <InvoiceDetailInner />
    </Suspense>
  );
}

function InvoiceDetailInner() {
  const { t, i18n } = useTranslation(['common', 'clientInvoices']);
  const { id: invoiceId = '' } = useParams<{ id: string }>();
  const { navigateTopLevel, goBack } = useNavigation();

  const [invoice, setInvoice] = useState<EnrichedInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment simulation state (kept from your original)
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError(t('clientInvoices:detail.noId'));
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        // Fetch invoice and clients in parallel
        const [invRes, clientsRes] = await Promise.all([
          getInvoiceById(invoiceId),
          getClients(),
        ]);

        const raw: RawInvoice = invRes.data.data;
        const clients = clientsRes.data.data.results;

        // Find the matching client (if any)
        const client = clients.find((c: any) => Number(c.id) === raw.client_id);
        const clientName = client?.name || raw.client_name || t('clientInvoices:detail.unknownClient');
        const clientAddress = client?.address || '—';
        const clientTaxId = client?.taxId || '—';

        setInvoice({
          id: String(raw.id),
          orderId: raw.order_id ? `#${raw.order_id}` : '—',
          clientName,
          clientAddress,
          clientTaxId,
          createdAt: raw.created_at || null,
          dueDate: raw.due_date || null,
          paidDate: raw.paid_date || null,
          total: raw.total ?? raw.total_amount ?? null,
          paid: raw.paid_amount ?? null,
          remaining: raw.remaining_amount ?? null,
          status: raw.payment_status || raw.status || '—',
          itemSummary: raw.item_summary ?? null,
          items: raw.items || [],
          notes: raw.notes || null,
        });
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError(t('clientInvoices:detail.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  // ─── Actions ──────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!invoice) return;
    openInvoicePdf({
      id: Number(invoice.id),
      order: invoice.orderId,
      client: invoice.clientName,
      createdAt: invoice.createdAt,
      status: invoice.status,
      itemSummary: invoice.itemSummary,
      items: invoice.items,
      total: formatAmount(invoice.total, i18n.language),
      paid: formatAmount(invoice.paid, i18n.language),
      remaining: formatAmount(invoice.remaining, i18n.language),
    });
  };

  // ─── Loading / Error states ──────────────────────────────────────────
  if (loading) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title={t('clientInvoices:detail.title')} />
        <section className="table-wrap">
          <div className="loading-state">{t('clientInvoices:detail.loading')}</div>
        </section>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title={t('clientInvoices:detail.title')} />
        <section className="table-wrap">
          <div className="error-state">{error || t('clientInvoices:detail.notFound')}</div>
        </section>
      </AppShell>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <AppShell role="client" activePage="client-invoices">
      <Topbar
        title={t('clientInvoices:detail.titleWithId', { id: invoice.id })}
        onBack={goBack}
        backLabel={t('clientInvoices:detail.backLabel')}
      />

      {error && <div className="error-state">{error}</div>}

      <section className="table-wrap">
        <div className={`box invoice-detail-card${invoice.status === 'overdue' ? ' overdue' : ''}`}>
          <div className="invoice-header">
            <div>
              <div className="invoice-brand">DistroHub</div>
              <h2 className="invoice-id">
                {t('clientInvoices:detail.invoiceId', { id: invoice.id })}
              </h2>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          <div className="invoice-meta-grid">
            <div className="invoice-meta-col">
              <p className="meta-section-label">{t('clientInvoices:detail.billedTo')}</p>
              <p className="meta-value-primary">{invoice.clientName}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.address')}</p>
              <p className="meta-value">{invoice.clientAddress}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.taxId')}</p>
              <p className="meta-value">{invoice.clientTaxId}</p>
            </div>
            <div className="invoice-meta-col">
              <p className="meta-section-label">{t('clientInvoices:detail.invoiceDetails')}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.linkedOrder')}</p>
              <p className="meta-value">{invoice.orderId}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.issueDate')}</p>
              <p className="meta-value">{formatDate(invoice.createdAt, i18n.language)}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.dueDate')}</p>
              <p className="meta-value">{formatDate(invoice.dueDate, i18n.language)}</p>
              {invoice.paidDate && (
                <>
                  <p className="meta-field-label">{t('clientInvoices:detail.paymentDate')}</p>
                  <p className="meta-value">{formatDate(invoice.paidDate, i18n.language)}</p>
                </>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="table-responsive">
            <table className="orders-table invoice-items-table">
              <thead>
                <tr>
                  <th>{t('clientInvoices:detail.table.item')}</th>
                  <th>{t('clientInvoices:detail.table.qty')}</th>
                  <th>{t('clientInvoices:detail.table.unitPrice')}</th>
                  <th>{t('clientInvoices:detail.table.total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-results">
                      {invoice.itemSummary || t('clientInvoices:detail.table.noItems')}
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{item.item_type || 'Item'}</td>
                      <td>{item.quantity ?? '—'}</td>
                      <td>{formatAmount(item.unit_price, i18n.language)}</td>
                      <td>{formatAmount(item.total_price, i18n.language)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span className="total-label">{t('clientInvoices:detail.total')}</span>
              <span className="total-value">{formatAmount(invoice.total, i18n.language)}</span>
            </div>
            <div className="invoice-total-row">
              <span className="total-label">{t('clientInvoices:detail.paid')}</span>
              <span className="total-value">{formatAmount(invoice.paid, i18n.language)}</span>
            </div>
            <div className="invoice-total-row invoice-grand-total">
              <span className="total-label">{t('clientInvoices:detail.remaining')}</span>
              <span className="total-value">{formatAmount(invoice.remaining, i18n.language)}</span>
            </div>
          </div>

          {invoice.notes && <div className="invoice-note">{invoice.notes}</div>}

          {/* Payment simulation (kept from your original) */}
          <div className="invoice-actions">
            {invoice.status !== 'paid' && !paid && (
              <button className="btn primary" onClick={() => setPaying(true)}>
                {t('clientInvoices:detail.payNow')}
              </button>
            )}
            {paid && (
              <span style={{ color: '#2c9a4b', fontWeight: 600, fontSize: 14 }}>
                {t('clientInvoices:detail.paymentConfirmed')}
              </span>
            )}
            <button className="btn" onClick={handlePrint}>
              {t('clientInvoices:detail.print')}
            </button>
            <button className="btn btn-outline" onClick={handleDownload}>
              {t('clientInvoices:detail.download')}
            </button>
          </div>

          {paying && !paid && (
            <div style={{ marginTop: 20, padding: 20, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: 16 }}>{t('clientInvoices:detail.payment.title')}</h4>
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  {t('clientInvoices:detail.payment.cardNumber')}
                </label>
                <input className="input" placeholder={t('clientInvoices:detail.payment.cardNumberPlaceholder')} maxLength={19} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    {t('clientInvoices:detail.payment.expiry')}
                  </label>
                  <input className="input" placeholder={t('clientInvoices:detail.payment.expiryPlaceholder')} maxLength={7} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    {t('clientInvoices:detail.payment.cvv')}
                  </label>
                  <input className="input" placeholder={t('clientInvoices:detail.payment.cvvPlaceholder')} maxLength={4} type="password" />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  {t('clientInvoices:detail.payment.cardholderName')}
                </label>
                <input className="input" placeholder={t('clientInvoices:detail.payment.cardholderPlaceholder')} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={() => { setPaid(true); setPaying(false); }}>
                  {t('clientInvoices:detail.payment.confirm')}
                </button>
                <button className="btn" onClick={() => setPaying(false)}>
                  {t('clientInvoices:detail.payment.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Support / Help */}
        <section className="box" style={{ marginTop: 14, maxWidth: 860, margin: '14px auto 0' }}>
          <div className="table-head">
            <p><strong>{t('clientInvoices:detail.support.message')}</strong></p>
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>
              {t('clientInvoices:detail.support.contact')}
            </button>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
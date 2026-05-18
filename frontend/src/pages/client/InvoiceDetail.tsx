import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import './InvoiceDetail.css';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';
import { getInvoiceById, getClients } from '../../lib/api/invoicesClientsSettingsService';

interface BackendInvoice {
  id: number;
  order_id: number | null;
  client_id: number | null;
  due_date: string;
  paid_date: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  notes: string | null;
}

interface DisplayInvoice {
  id: string;
  orderId: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  issued: string;
  due: string;
  paidDate: string | null;
  amount: number;
  status: string;
  vatRate: number;
  items: LineItem[];
  notes: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatEGP(value: number, lang: string): string {
  return value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  const [invoice, setInvoice] = useState<DisplayInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        const [invRes, clientsRes] = await Promise.all([
          getInvoiceById(invoiceId),
          getClients(),
        ]);

        const raw = invRes.data.data as unknown as BackendInvoice;
        const clients = clientsRes.data.data.results;

        const client = clients.find((c: any) => Number(c.id) === raw.client_id);
        const clientName = client?.name || 'Unknown';
        const clientAddress = client?.address || '—';
        const clientTaxId = client?.taxId || '—';

        setInvoice({
          id: String(raw.id),
          orderId: raw.order_id ? `#${raw.order_id}` : '—',
          clientName,
          clientAddress,
          clientTaxId,
          issued: formatDate(raw.created_at, i18n.language),
          due: formatDate(raw.due_date, i18n.language),
          paidDate: formatDate(raw.paid_date, i18n.language),
          amount: raw.total_amount ?? 0,
          status: raw.status || '—',
          vatRate: 0.14,
          items: [],
          notes: raw.notes || '',
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

  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!invoice) return;
    const sub = invoice.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const v = sub * invoice.vatRate;
    const tot = sub + v;
    downloadText(`invoice-${invoice.id}.txt`, [
      `INVOICE #${invoice.id}`,
      ``,
      `Billed To:   ${invoice.clientName}`,
      `Address:     ${invoice.clientAddress}`,
      `Tax ID:      ${invoice.clientTaxId}`,
      ``,
      `Linked Order: ${invoice.orderId}`,
      `Issue Date:   ${invoice.issued}`,
      `Due Date:     ${invoice.due}`,
      invoice.paidDate ? `Payment Date: ${invoice.paidDate}` : '',
      ``,
      `Subtotal: EGP ${sub.toFixed(2)}`,
      `VAT (${(invoice.vatRate * 100).toFixed(0)}%): EGP ${v.toFixed(2)}`,
      `Total:    EGP ${tot.toFixed(2)}`,
      `Status:   ${invoice.status}`,
    ].filter((l) => l !== undefined));
  };

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

  if (error || !invoice) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title={t('clientInvoices:detail.title')} />
        <section className="table-wrap">
          <div className="error-state">{error || t('clientInvoices:detail.notFound')}</div>
        </section>
      </AppShell>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = subtotal * invoice.vatRate;
  const total = subtotal + vat;

  return (
    <AppShell role="client" activePage="client-invoices">
      <Topbar title={t('clientInvoices:detail.title')} onBack={goBack} backLabel={t('clientInvoices:detail.backLabel')} />

      <section className="table-wrap">
        <div className={`box invoice-detail-card${invoice.status === 'overdue' ? ' overdue' : ''}`}>
          <div className="invoice-header">
            <div>
              <div className="invoice-brand">DistroHub</div>
              <h2 className="invoice-id">{t('clientInvoices:detail.invoiceId', { id: invoice.id })}</h2>
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
              <p className="meta-value">{invoice.issued}</p>
              <p className="meta-field-label">{t('clientInvoices:detail.dueDate')}</p>
              <p className="meta-value">{invoice.due}</p>
              {invoice.paidDate && (
                <>
                  <p className="meta-field-label">{t('clientInvoices:detail.paymentDate')}</p>
                  <p className="meta-value">{invoice.paidDate}</p>
                </>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="orders-table invoice-items-table">
              <thead>
                <tr>
                  <th>{t('clientInvoices:detail.table.item')}</th>
                  <th style={{ textAlign: 'center' }}>{t('clientInvoices:detail.table.qty')}</th>
                  <th style={{ textAlign: 'right' }}>{t('clientInvoices:detail.table.unitPrice')}</th>
                  <th style={{ textAlign: 'right' }}>{t('clientInvoices:detail.table.total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '12px', color: 'var(--muted)' }}>{t('clientInvoices:detail.table.noItems')}</td></tr>
                ) : (
                  invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatEGP(item.unitPrice, i18n.language)}</td>
                      <td style={{ textAlign: 'right' }}>{formatEGP(item.quantity * item.unitPrice, i18n.language)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span className="total-label">{t('clientInvoices:detail.subtotal')}</span>
              <span className="total-value">{formatEGP(subtotal, i18n.language)}</span>
            </div>
            <div className="invoice-total-row">
              <span className="total-label">{t('clientInvoices:detail.vat', { rate: (invoice.vatRate * 100).toFixed(0) })}</span>
              <span className="total-value">{formatEGP(vat, i18n.language)}</span>
            </div>
            <div className="invoice-total-row invoice-grand-total">
              <span className="total-label">{t('clientInvoices:detail.grandTotal')}</span>
              <span className="total-value">{formatEGP(total, i18n.language)} EGP</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="invoice-note">{invoice.notes}</div>
          )}

          <div className="invoice-actions">
            {invoice.status !== 'paid' && !paid && (
              <button className="btn primary" onClick={() => setPaying(true)}>{t('clientInvoices:detail.payNow')}</button>
            )}
            {paid && <span style={{ color: '#2c9a4b', fontWeight: 600, fontSize: 14 }}>{t('clientInvoices:detail.paymentConfirmed')}</span>}
            <button className="btn" onClick={handlePrint}>{t('clientInvoices:detail.print')}</button>
            <button className="btn btn-outline" onClick={handleDownload}>{t('clientInvoices:detail.download')}</button>
          </div>

          {paying && !paid && (
            <div style={{ marginTop: 20, padding: 20, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: 16 }}>{t('clientInvoices:detail.payment.title')}</h4>
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t('clientInvoices:detail.payment.cardNumber')}</label>
                <input className="input" placeholder={t('clientInvoices:detail.payment.cardNumberPlaceholder')} maxLength={19} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t('clientInvoices:detail.payment.expiry')}</label>
                  <input className="input" placeholder={t('clientInvoices:detail.payment.expiryPlaceholder')} maxLength={7} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t('clientInvoices:detail.payment.cvv')}</label>
                  <input className="input" placeholder={t('clientInvoices:detail.payment.cvvPlaceholder')} maxLength={4} type="password" />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t('clientInvoices:detail.payment.cardholderName')}</label>
                <input className="input" placeholder={t('clientInvoices:detail.payment.cardholderPlaceholder')} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={() => { setPaid(true); setPaying(false); }}>{t('clientInvoices:detail.payment.confirm')}</button>
                <button className="btn" onClick={() => setPaying(false)}>{t('clientInvoices:detail.payment.cancel')}</button>
              </div>
            </div>
          )}
        </div>

        <section className="box" style={{ marginTop: 14, maxWidth: 860, margin: '14px auto 0' }}>
          <div className="table-head">
            <p><strong>{t('clientInvoices:detail.support.message')}</strong></p>
            <button className="btn primary" onClick={() => navigateTopLevel('support')}>{t('clientInvoices:detail.support.contact')}</button>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

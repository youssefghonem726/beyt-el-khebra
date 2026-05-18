import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import { getInvoices } from '../../lib/api/invoicesClientsSettingsService';
import type { Invoice } from '../../lib/api/types';

function formatDate(value: string | null | undefined, lang: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatEGP(amount: number | null | undefined, lang: string): string {
  if (amount == null) return '—';
  return `EGP ${amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientInvoices() {
  return (
    <Suspense fallback={null}>
      <ClientInvoicesInner />
    </Suspense>
  );
}

function ClientInvoicesInner() {
  const { t, i18n } = useTranslation(['common', 'clientInvoices']);
  const { navigateTopLevel } = useNavigation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await getInvoices();
        setInvoices(res.data.data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setInvoices([]);
        } else {
          console.error('Failed to load invoices:', err);
          setError(t('clientInvoices:error'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title={t('clientInvoices:title')} />
        <div className="loading-state">{t('clientInvoices:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="client-invoices">
        <Topbar title={t('clientInvoices:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-invoices">
      <Topbar title={t('clientInvoices:title')} />
      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>{t('clientInvoices:myInvoices')}</h3>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('clientInvoices:table.id')}</th>
              <th>{t('clientInvoices:table.order')}</th>
              <th>{t('clientInvoices:table.status')}</th>
              <th>{t('clientInvoices:table.amount')}</th>
              <th>{t('clientInvoices:table.dueDate')}</th>
              <th>{t('clientInvoices:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-results">{t('clientInvoices:empty')}</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>#{inv.id}</strong></td>
                  <td>{inv.order_id ? `#${inv.order_id}` : inv.orderId || '—'}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>{formatEGP(inv.total_amount ?? inv.amount, i18n.language)}</td>
                  <td>{formatDate(inv.due_date ?? inv.due, i18n.language)}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel(`/client/invoices/${inv.id}`)}>
                      {t('clientInvoices:table.view')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

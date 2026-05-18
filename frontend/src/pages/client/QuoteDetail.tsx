import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import { getQuotes } from '../../lib/api/quotesService';
import type { QuoteResponse } from '../../lib/api/quotesService';

interface QuoteSummary {
  id: number;
  status: string;
  amount: number;
}

function fmt(n: number, lang: string): string {
  return n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeTotalFromItems(items: QuoteResponse['items']): number {
  return items.reduce((sum, item) => {
    const price =
      typeof item.estimated_total_price === 'string'
        ? parseFloat(item.estimated_total_price)
        : item.estimated_total_price;
    return sum + (price || 0);
  }, 0);
}

export default function QuoteDetail() {
  return (
    <Suspense fallback={null}>
      <QuoteDetailInner />
    </Suspense>
  );
}

function QuoteDetailInner() {
  const { t, i18n } = useTranslation(['common', 'quotes']);
  const { navigateTopLevel } = useNavigation();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await getQuotes();
        const rawQuotes: QuoteResponse[] = res.data.data;

        const summaries: QuoteSummary[] = rawQuotes.map((q) => {
          let amount: number;
          if (q.total_estimated_price != null) {
            amount =
              typeof q.total_estimated_price === 'string'
                ? parseFloat(q.total_estimated_price)
                : q.total_estimated_price;
          } else {
            amount = computeTotalFromItems(q.items || []);
          }

          const statusMap: Record<string, string> = {
            pending: 'awaiting_confirmation',
            approved: 'approved',
            rejected: 'rejected',
            converted: 'converted',
          };

          return {
            id: q.id,
            status: statusMap[q.status] || q.status,
            amount,
          };
        });

        setQuotes(summaries);
      } catch (err) {
        console.error('Failed to load quotes:', err);
        setError(t('quotes:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  if (loading) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar title={t('quotes:title')} />
        <div className="loading-state">{t('quotes:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar title={t('quotes:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar title={t('quotes:title')} />

      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>{t('quotes:myQuotes')}</h3>
          <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>
            {t('quotes:requestNew')}
          </button>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('quotes:table.id')}</th>
              <th>{t('quotes:table.status')}</th>
              <th>{t('quotes:table.amount')}</th>
              <th>{t('quotes:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-results">{t('quotes:empty')}</td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id}>
                  <td>#{q.id}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td style={{ fontWeight: 600 }}>EGP {fmt(q.amount, i18n.language)}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => navigateTopLevel(`/client/quotes/${q.id}`)}
                    >
                      {t('quotes:table.review')}
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

import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import { getQuotes, type QuoteResponse } from '../../lib/api/quotesService';

// ─── Helpers ────────────────────────────────────────────────────────

function formatAmount(
  amount: number | string | null,
  lang: string
): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `EGP ${value.toLocaleString(
    lang === 'ar' ? 'ar-EG' : 'en-EG',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

function formatDate(
  iso: string | null,
  lang: string
): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-GB',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

function quoteTotal(quote: QuoteResponse): number {
  if (
    quote.total_estimated_price !== null &&
    quote.total_estimated_price !== undefined
  ) {
    return Number(quote.total_estimated_price) || 0;
  }
  return (quote.items || []).reduce(
    (sum, item) => sum + (Number(item.estimated_total_price) || 0),
    0
  );
}

// Map API status to UI status
function mapStatus(status: string): string {
  return status === 'pending' ? 'awaiting_confirmation' : status;
}

// ─── Component ──────────────────────────────────────────────────────

export default function Quotes() {
  return (
    <Suspense fallback={null}>
      <QuotesInner />
    </Suspense>
  );
}

function QuotesInner() {
  const { t, i18n } = useTranslation(['common', 'quotes']);
  const { navigateTopLevel } = useNavigation();
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await getQuotes();
        setQuotes(res.data.data);
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

  const lang = i18n.language;

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar title={t('quotes:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>{t('quotes:myQuotes')}</h3>
          <button
            className="btn primary"
            onClick={() => navigateTopLevel('place-new-order')}
          >
            {t('quotes:requestNew')}
          </button>
        </div>

        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('quotes:table.id')}</th>
              <th>{t('quotes:table.order')}</th>
              <th>{t('quotes:table.product')}</th>
              <th>{t('quotes:table.status')}</th>
              <th>{t('quotes:table.amount')}</th>
              <th>{t('quotes:table.created')}</th>
              <th>{t('quotes:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-results">
                  {t('quotes:empty')}
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>#{quote.id}</td>
                  <td>#{quote.order}</td>
                  <td>
                    {quote.product_summary ||
                      t('quotes:orderPlaceholder', { id: quote.order })}
                  </td>
                  <td>
                    <StatusBadge status={mapStatus(quote.status)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatAmount(quoteTotal(quote), lang)}
                  </td>
                  <td>{formatDate(quote.created_at, lang)}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() =>
                        navigateTopLevel(`/client/quotes/${quote.id}`)
                      }
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
import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import {
  approveQuote,
  getQuoteById,
  rejectQuote,
  requestQuoteChanges,
  type QuoteResponse,
} from '../../lib/api/quotesService';

// ─── Helpers ────────────────────────────────────────────────────────
function formatMoney(
  value: number | string | null | undefined,
  lang: string
): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `EGP ${amount.toLocaleString(
    lang === 'ar' ? 'ar-EG' : 'en-EG',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

function formatDate(
  value: string | null | undefined,
  lang: string
): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-GB',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

function computeQuoteTotal(quote: QuoteResponse): number {
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

// Map API status to UI status used by StatusBadge
function mapStatus(status: string): string {
  return status === 'pending' ? 'awaiting_confirmation' : status;
}

// ─── Component ──────────────────────────────────────────────────────
export default function QuoteDetail() {
  return (
    <Suspense fallback={null}>
      <QuoteDetailInner />
    </Suspense>
  );
}

function QuoteDetailInner() {
  const { t, i18n } = useTranslation(['common', 'quotes']);
  const { id = '' } = useParams<{ id: string }>();
  const { goBack } = useNavigation();

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeNotes, setChangeNotes] = useState('');

  const loadQuote = async () => {
    if (!id) {
      setError(t('quotes:detail.noId'));
      setLoading(false);
      return;
    }

    try {
      const res = await getQuoteById(id);
      setQuote(res.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load quote:', err);
      setError(t('quotes:detail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuote();
  }, [id]);

  const runAction = async (
    action: () => Promise<unknown>,
    successKey: string
  ) => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(t(successKey));
      await loadQuote();
    } catch (err: any) {
      console.error('Quote action failed:', err);
      const detail =
        err?.response?.data?.errors?.detail ??
        err?.response?.data?.message ??
        t('quotes:detail.actionFailed');
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    const notes = changeNotes.trim();
    if (!notes) {
      setError(t('quotes:detail.changeNotesRequired'));
      return;
    }

    await runAction(
      () => requestQuoteChanges(id, notes),
      'quotes:detail.changesRequested'
    );
    setChangeNotes('');
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar
          title={t('quotes:detail.loadingTitle')}
          onBack={goBack}
          backLabel={t('quotes:detail.backLabel')}
        />
        <div className="loading-state">{t('quotes:loading')}</div>
      </AppShell>
    );
  }

  if (!quote) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar
          title={t('quotes:detail.title')}
          onBack={goBack}
          backLabel={t('quotes:detail.backLabel')}
        />
        <div className="error-state">
          {error || t('quotes:detail.notFound')}
        </div>
      </AppShell>
    );
  }

  const canRespond = quote.status === 'pending';
  const total = computeQuoteTotal(quote);
  const lang = i18n.language;

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar
        title={t('quotes:detail.titleWithId', { id: quote.id })}
        onBack={goBack}
        backLabel={t('quotes:detail.backLabel')}
      />

      {message && (
        <div
          className="box"
          style={{ color: '#147a3e', marginBottom: 12 }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="box"
          style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 12 }}>
          <div>
            <h3>{t('quotes:detail.quoteId', { id: quote.id })}</h3>
            <p style={{ color: 'var(--muted)' }}>
              {t('quotes:detail.orderId', { id: quote.order })}
            </p>
          </div>
          <StatusBadge status={mapStatus(quote.status)} />
        </div>

        <div className="grid-4" style={{ marginBottom: 16 }}>
          <div className="box">
            <p className="eyebrow">{t('quotes:detail.product')}</p>
            <strong>
              {quote.product_summary ||
                t('quotes:detail.orderPlaceholder', { id: quote.order })}
            </strong>
          </div>
          <div className="box">
            <p className="eyebrow">{t('quotes:detail.totalAmount')}</p>
            <strong>{formatMoney(total, lang)}</strong>
          </div>
          <div className="box">
            <p className="eyebrow">{t('quotes:detail.created')}</p>
            <strong>{formatDate(quote.created_at, lang)}</strong>
          </div>
          <div className="box">
            <p className="eyebrow">{t('quotes:detail.orderStatus')}</p>
            <StatusBadge status={quote.order_status || '-'} />
          </div>
        </div>

        {quote.notes && (
          <div className="box" style={{ marginBottom: 16 }}>
            <h3>{t('quotes:detail.notes')}</h3>
            <p>{quote.notes}</p>
          </div>
        )}

        <h3 style={{ marginBottom: 10 }}>
          {t('quotes:detail.breakdown')}
        </h3>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('quotes:detail.table.item')}</th>
              <th>{t('quotes:detail.table.qty')}</th>
              <th>{t('quotes:detail.table.unitPrice')}</th>
              <th>{t('quotes:detail.table.total')}</th>
              <th>{t('quotes:detail.table.notes')}</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="no-results">
                  {t('quotes:detail.table.noItems')}
                </td>
              </tr>
            ) : (
              quote.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.item_type || t('quotes:detail.table.unknownItem')}</td>
                  <td>{item.quantity ?? '—'}</td>
                  <td>{formatMoney(item.estimated_unit_price, lang)}</td>
                  <td>{formatMoney(item.estimated_total_price, lang)}</td>
                  <td>{item.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {(quote.order_items || []).length > 0 && (
          <>
            <h3 style={{ marginTop: 20, marginBottom: 10 }}>
              {t('quotes:detail.orderItems')}
            </h3>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>{t('quotes:detail.table.item')}</th>
                  <th>{t('quotes:detail.table.qty')}</th>
                  <th>{t('quotes:detail.table.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {quote.order_items!.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_type || t('quotes:detail.table.unknownItem')}</td>
                    <td>{item.quantity ?? '—'}</td>
                    <td>{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {canRespond && (
          <div className="box" style={{ marginTop: 18 }}>
            <h3>{t('quotes:detail.respond.title')}</h3>
            <p style={{ color: 'var(--muted)' }}>
              {t('quotes:detail.respond.description')}
            </p>
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 12,
              }}
            >
              <button
                className="btn primary"
                disabled={submitting}
                onClick={() =>
                  runAction(
                    () => approveQuote(id),
                    'quotes:detail.approveSuccess'
                  )
                }
              >
                {t('quotes:detail.respond.approve')}
              </button>
              <button
                className="btn"
                disabled={submitting}
                onClick={() =>
                  runAction(
                    () => rejectQuote(id),
                    'quotes:detail.rejectSuccess'
                  )
                }
              >
                {t('quotes:detail.respond.reject')}
              </button>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>{t('quotes:detail.respond.requestChanges')}</label>
              <textarea
                className="textarea"
                rows={4}
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder={t(
                  'quotes:detail.respond.changePlaceholder'
                )}
              />
            </div>
            <button
              className="btn"
              disabled={submitting}
              onClick={handleRequestChanges}
            >
              {t('quotes:detail.respond.sendRequest')}
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
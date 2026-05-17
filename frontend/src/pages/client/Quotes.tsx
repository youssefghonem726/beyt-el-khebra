import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
// Direct service import – bypasses VITE_USE_MOCK
import { getQuotes } from '../../lib/api/quotesService';
import type { QuoteResponse } from '../../lib/api/quotesService';

interface QuoteSummary {
  id: number;
  status: string;           // normalized for StatusBadge
  amount: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Compute total from line items if total_estimated_price is missing
function computeTotalFromItems(items: QuoteResponse['items']): number {
  return items.reduce((sum, item) => {
    const price =
      typeof item.estimated_total_price === 'string'
        ? parseFloat(item.estimated_total_price)
        : item.estimated_total_price;
    return sum + (price || 0);
  }, 0);
}

export default function Quotes() {
  const { navigateTopLevel } = useNavigation();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await getQuotes();
        const rawQuotes: QuoteResponse[] = res.data.data;
        console.log('Quotes - raw:', rawQuotes);

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

          // Map backend status to a value StatusBadge understands
          const statusMap: Record<string, string> = {
            pending: 'awaiting_confirmation',
            approved: 'approved',
            rejected: 'rejected',
            converted: 'converted',
          };
          const normalizedStatus = statusMap[q.status] || q.status;

          return {
            id: q.id,
            status: normalizedStatus,
            amount,
          };
        });

        setQuotes(summaries);
      } catch (err) {
        console.error('Failed to load quotes:', err);
        setError('Could not load your quotes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  if (loading) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar title="Quotes" />
        <div className="loading-state">Loading quotes...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="quotes">
        <Topbar title="Quotes" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar title="Quotes" />

      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>My Quotes</h3>
          <button
            className="btn primary"
            onClick={() => navigateTopLevel('place-new-order')}
          >
            Request New Quote
          </button>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-results">
                  No quotes available.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id}>
                  <td>#{q.id}</td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td style={{ fontWeight: 600 }}>EGP {fmt(q.amount)}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() =>
                        navigateTopLevel(`/client/quotes/${q.id}`)
                      }
                    >
                      Review Quote
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      {/* Standard pricing section removed – no client-facing pricing API yet */}
    </AppShell>
  );
}
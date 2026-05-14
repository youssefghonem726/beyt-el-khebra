import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface PricingRow {
  id: string;
  product: string;
  size: string;
  paper: string;
  pricePerUnit: number;
  minQty: number;
  active: boolean;
}

interface QuoteItem {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  orderId: string;
  clientId: string;
  status: string;
  vatRate: number;
  validUntil?: string;
  invoiceId?: string;
  items: QuoteItem[];
  notes: string;
}

interface QuoteSummary {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  actionLabel: string;
  actionPage: string;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeAmount(items: QuoteItem[], vatRate: number): number {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  return subtotal + subtotal * vatRate;
}

function normalizeStatus(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('awaiting') || lower === 'awaiting confirmation') return 'awaiting_confirmation';
  if (lower === 'approved') return 'approved';
  return raw.toLowerCase().replace(/\s+/g, '_');
}

interface Props {
  clientId?: string;
}

export default function Quotes({ clientId = 'CL-001' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/quotes.json').then(res => {
        if (!res.ok) throw new Error('Failed to load quotes');
        return res.json();
      }),
      fetch('/data/json/pricing.json').then(res => {
        if (!res.ok) throw new Error('Failed to load pricing');
        return res.json();
      })
    ])
      .then(([quotesData, pricingData]) => {
        const clientQuotes = quotesData.filter((q: Quote) => q.clientId === clientId);
        
        const summaries: QuoteSummary[] = clientQuotes.map((q: Quote) => {
          const amount = computeAmount(q.items, q.vatRate);
          const normalizedStatus = normalizeStatus(q.status);
          
          let actionLabel = '';
          let actionPage = '';
          
          if (normalizedStatus === 'awaiting_confirmation') {
            actionLabel = 'Review Quote';
            actionPage = `/client/quotes/${q.id}`;
          } else if (normalizedStatus === 'approved' && q.invoiceId) {
            actionLabel = 'View Invoice';
            actionPage = `/client/invoices/${q.invoiceId}`;
          }
          
          return {
            id: q.id,
            orderId: q.orderId,
            status: normalizedStatus,
            amount,
            actionLabel,
            actionPage,
          };
        });
        
        setQuotes(summaries);
        setPricing(pricingData.filter((p: PricingRow) => p.active));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Could not load quotes or pricing. Please try again later.');
        setLoading(false);
      });
  }, [clientId]);

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

      <section className="table-wrap" style={{ marginBottom: 16 }}>
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>My Quotes</h3>
          <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>
            Request New Quote
          </button>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Order</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-results">No quotes available.</td>
              </tr>
            ) : (
              quotes.map(q => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>{q.orderId}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td style={{ fontWeight: 600 }}>EGP {fmt(q.amount)}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel(q.actionPage)}>
                      {q.actionLabel}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <div className="table-head" style={{ marginBottom: showPricing ? 14 : 0 }}>
          <div>
            <h3>Standard Pricing</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              Reference prices — your quote may vary based on specs and quantity.
            </p>
          </div>
          <button className="btn" onClick={() => setShowPricing(v => !v)}>
            {showPricing ? 'Hide Prices' : 'View Prices'}
          </button>
        </div>

        {showPricing && (
          pricing.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Pricing not available.</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Paper / Material</th>
                  <th style={{ textAlign: 'right' }}>Price / Unit (EGP)</th>
                  <th style={{ textAlign: 'center' }}>Min Order</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.product}</td>
                    <td>{row.size}</td>
                    <td>{row.paper}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                      {fmt(row.pricePerUnit)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.minQty} pcs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>
    </AppShell>
  );
}
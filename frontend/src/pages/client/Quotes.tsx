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

const QUOTES = [
  { id: 'Q-211', order: '#1021', status: 'Awaiting Confirmation', amount: 'EGP 1,200.00', action: { label: 'Review Quote',  page: 'quote-detail-Q-211'       } },
  { id: 'Q-208', order: '#1018', status: 'Approved',              amount: 'EGP 950.00',   action: { label: 'View Invoice',  page: 'invoice-detail-INV-9018'  } },
];

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Quotes() {
  const { navigateTopLevel } = useNavigation();
  const [pricing, setPricing]   = useState<PricingRow[]>([]);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    fetch('/data/pricing.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: PricingRow[]) => setPricing(data.filter(p => p.active)))
      .catch(() => {});
  }, []);

  return (
    <AppShell role="client" activePage="quotes">
      <Topbar title="Quotes" />

      {/* ── My quotes ── */}
      <section className="table-wrap" style={{ marginBottom: 16 }}>
        <div className="table-head" style={{ marginBottom: 10 }}>
          <h3>My Quotes</h3>
          <button className="btn primary" onClick={() => navigateTopLevel('place-new-order')}>
            Request New Quote
          </button>
        </div>
        <tr>
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
            {QUOTES.map(q => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.order}</td>
                <td><StatusBadge status={q.status} /></td>
                <td style={{ fontWeight: 600 }}>{q.amount}</td>
                <td>
                  <button className="btn" onClick={() => navigateTopLevel(q.action.page)}>
                    {q.action.label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Standard pricing reference ── */}
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
            </table>
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
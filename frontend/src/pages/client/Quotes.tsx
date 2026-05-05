import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

interface Quote {
  id: string;
  order: string;
  status: string;
  amount: string;
  action: {
    label: string;
    page: string;
  };
}

export default function Quotes({ onNavigate }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/quotes.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Quote[]) => {
        setQuotes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load quotes:', err);
        setError('Could not load your quotes. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role="client" activePage="quotes" onNavigate={onNavigate}>
        <Topbar title="Quotes" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="loading-state">Loading quotes...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="quotes" onNavigate={onNavigate}>
        <Topbar title="Quotes" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="quotes" onNavigate={onNavigate}>
      <Topbar title="Quotes" userName="Ahmed Store" />
      <section className="table-wrap">
        <h3>Pending &amp; Approved Quotes</h3>
        <table>
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
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.order}</td>
                <td><StatusBadge status={q.status} /></td>
                <td>{q.amount}</td>
                <td>
                  <button className="btn" onClick={() => onNavigate(q.action.page)}>
                    {q.action.label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
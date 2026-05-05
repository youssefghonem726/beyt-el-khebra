import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

interface Invoice {
  id: string;
  order: string;
  issued: string;
  due: string;
  amount: string;
  status: string;
}

export default function ClientInvoices({ onNavigate }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/data/client-invoices.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Invoice[]) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load invoices:', err);
        setError('Could not load your invoices. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchQ = !query || inv.id.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || inv.status.toLowerCase() === filterStatus.toLowerCase();
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
        <Topbar title="My Invoices" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="loading-state">Loading your invoices...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
        <Topbar title="My Invoices" userName="Ahmed Store" />
        <section className="table-wrap">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
      <Topbar title="My Invoices" userName="Ahmed Store" />
      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoice History</h3>
          <div className="search-container">
            <input 
              className="input" 
              type="search" 
              placeholder="Search by invoice ID" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
            />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
              ▼
            </button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>Status</label>
                  <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Overdue</option>
                  </select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Order</th>
                <th>Date Issued</th>
                <th>Due Date</th>
                <th>Amount (EGP)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} className="no-results">No matching results</td></tr>
                : filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td><strong>{inv.id}</strong></td>
                    <td>{inv.order}</td>
                    <td>{inv.issued}</td>
                    <td>{inv.due}</td>
                    <td>{inv.amount}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div className="action-buttons">
                        {inv.status !== 'Paid' && <button className="btn btn-sm primary">Pay Now</button>}
                        <button className="btn btn-sm" onClick={() => onNavigate(`invoice-detail:${inv.id}`)}>View</button>
                        {inv.status === 'Paid' && <button className="btn btn-sm btn-outline">Download</button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="box" style={{ marginTop: 14 }}>
        <div className="table-head">
          <p><strong>Need help with an invoice?</strong> Our support team is here to help.</p>
          <button className="btn primary" onClick={() => onNavigate('support')}>Contact Support</button>
        </div>
      </section>
    </AppShell>
  );
}
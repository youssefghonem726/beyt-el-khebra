import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

const INVOICES = [
  { id: 'INV-9021', order: '#1021', issued: '21 Apr 2025', due: '28 Apr 2025', amount: '1,200.00', status: 'Paid' },
  { id: 'INV-9018', order: '#1018', issued: '15 Apr 2025', due: '22 Apr 2025', amount: '950.00', status: 'Paid' },
  { id: 'INV-9015', order: '#1015', issued: '10 Apr 2025', due: '17 Apr 2025', amount: '850.00', status: 'Paid' },
  { id: 'INV-9012', order: '#1012', issued: '05 Apr 2025', due: '12 Apr 2025', amount: '2,100.00', status: 'Pending' },
  { id: 'INV-9008', order: '#1008', issued: '28 Mar 2025', due: '04 Apr 2025', amount: '3,500.00', status: 'Overdue' },
];

export default function ClientInvoices({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = INVOICES.filter((inv) => {
    const matchQ = !query || inv.id.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || inv.status.toLowerCase() === filterStatus.toLowerCase();
    return matchQ && matchS;
  });

  return (
    <AppShell role="client" activePage="client-invoices" onNavigate={onNavigate}>
      <Topbar title="My Invoices" userName="Client Name" />
      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoice History</h3>
          <div className="search-container">
            <input className="input" type="search" placeholder="Search by invoice ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>Status</label>
                  <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option>Paid</option><option>Pending</option><option>Overdue</option>
                  </select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
              </div>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr><th>Invoice ID</th><th>Order</th><th>Date Issued</th><th>Due Date</th><th>Amount (EGP)</th><th>Status</th><th>Action</th></tr>
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
                        <button className="btn btn-sm">View</button>
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

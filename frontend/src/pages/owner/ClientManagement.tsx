import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

const CLIENTS = [
  { name: 'Ahmed Store', email: 'ahmed@store.com', phone: '+20 101 000 1021', page: 'client-detail-ahmed' },
  { name: 'Design Hub', email: 'info@designhub.com', phone: '+20 100 222 3100', page: 'client-detail-design-hub' },
  { name: 'Retail Plus', email: 'contact@retailplus.com', phone: '+20 122 777 4400', page: 'client-detail-retail-plus' },
  { name: 'PrintWorks', email: 'hello@printworks.com', phone: '+20 111 444 5500', page: '' },
  { name: 'Spark Creative', email: 'team@sparkcreative.com', phone: '+20 115 800 3321', page: '' },
  { name: 'Nile Office Supply', email: 'support@nileoffice.com', phone: '+20 100 900 2211', page: '' },
  { name: 'Cairo Media', email: 'contact@cairomedia.com', phone: '+20 122 444 6600', page: '' },
];

export default function ClientManagement({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = CLIENTS.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
      <Topbar title="Client Management" userName="Admin User" />
      <section className="box">
        <div className="table-head">
          <h3>All Clients</h3>
          <div className="search-container">
            <input className="input" type="search" placeholder="Search by client name, email, or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>🔽</button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>Status</label>
                  <select className="select"><option>All Status</option><option>Active</option><option>Inactive</option></select>
                </div>
                <div className="field">
                  <label>Type</label>
                  <select className="select"><option>All Types</option><option>Individual</option><option>Business</option></select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply Filters</button>
              </div>
            )}
          </div>
        </div>
        <div className="client-grid">
          {filtered.map((c) => (
            <a key={c.name} className="client-card-link" href="#" onClick={(e) => { e.preventDefault(); if (c.page) onNavigate(c.page); }}>
              <h3>{c.name}</h3>
              <p>{c.email}</p>
              <p>{c.phone}</p>
              <p><strong>Click to open full profile</strong></p>
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

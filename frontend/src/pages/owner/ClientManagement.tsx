import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

export default function ClientManagement({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/clients.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Client[]) => {
        setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load clients:', err);
        setError('Could not load client data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
        <Topbar title="Client Management" userName="Admin User" />
        <section className="box">
          <div className="loading-state">Loading clients...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
        <Topbar title="Client Management" userName="Admin User" />
        <section className="box">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
      <Topbar title="Client Management" userName="Admin User" />
      <section className="box">
        <div className="table-head">
          <h3>All Clients</h3>
          <div className="search-container">
            <input
              className="input"
              type="search"
              placeholder="Search by client name, email, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>
              ˅
            </button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>Status</label>
                  <select className="select">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className="field">
                  <label>Type</label>
                  <select className="select">
                    <option>All Types</option>
                    <option>Individual</option>
                    <option>Business</option>
                  </select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="client-grid">
          {filtered.map((c) => (
            <a
              key={c.name}
              className="client-card-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (c.page) onNavigate(c.page);
              }}
            >
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
import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { getClients } from '../../lib/api';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  since: string | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
  };
}

export default function ClientManagement() {
  const { navigateTopLevel } = useNavigation();
  const [query, setQuery]             = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Fetch clients via API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await getClients();
        setClients(res.data.data.results);
      } catch (err) {
        console.error(err);
        setError('Could not load client data.');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filtered = clients.filter(c => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management">
        <Topbar title="Client Management" />
        <section className="box"><div className="loading-state">Loading clients...</div></section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="client-management">
        <Topbar title="Client Management" />
        <section className="box"><div className="error-state">{error}</div></section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="client-management">
      <Topbar title="Client Management" />

      {/* Clients grid */}
      <section className="box">
        <div className="table-head">
          <h3>All Clients</h3>
          <div className="search-container">
            <input
              className="input"
              type="search"
              placeholder="Search by name, email, or phone"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
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
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
              </div>
            )}
          </div>
        </div>
        <div className="client-grid">
          {filtered.map(c => (
            <a
              key={c.id}
              className="client-card-link"
              href="#"
              onClick={e => {
                e.preventDefault();
                navigateTopLevel(`/owner/clients/${c.id}`);
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
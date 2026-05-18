import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';
import type { Client } from '../../lib/api/invoicesClientsSettingsService';

export default function ClientManagement() {
  return (
    <Suspense fallback={null}>
      <ClientManagementInner />
    </Suspense>
  );
}

function ClientManagementInner() {
  const { t } = useTranslation(['common', 'clientManagement']);
  const { navigateTopLevel } = useNavigation();
  const [query, setQuery]             = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await getClients();
        setClients(res.data.data.results);
        console.log('ClientManagement - clients:', res.data.data.results);
      } catch (err) {
        console.error(err);
        setError(t('clientManagement:error'));
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
        <Topbar title={t('clientManagement:title')} />
        <section className="box"><div className="loading-state">{t('clientManagement:loading')}</div></section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="client-management">
        <Topbar title={t('clientManagement:title')} />
        <section className="box"><div className="error-state">{error}</div></section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="client-management">
      <Topbar title={t('clientManagement:title')} />

      <section className="box">
        <div className="table-head">
          <h3>{t('clientManagement:table.title')}</h3>
          <div className="search-container">
            <input
              className="input"
              type="search"
              placeholder={t('clientManagement:table.searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="filter-icon" type="button" onClick={() => setDropdownOpen(o => !o)}>▼</button>
            {dropdownOpen && (
              <div className="filter-dropdown show">
                <div className="field">
                  <label>{t('clientManagement:filter.status')}</label>
                  <select className="select">
                    <option>{t('clientManagement:filter.allStatus')}</option>
                    <option>{t('clientManagement:filter.active')}</option>
                    <option>{t('clientManagement:filter.inactive')}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t('clientManagement:filter.type')}</label>
                  <select className="select">
                    <option>{t('clientManagement:filter.allTypes')}</option>
                    <option>{t('clientManagement:filter.individual')}</option>
                    <option>{t('clientManagement:filter.business')}</option>
                  </select>
                </div>
                <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>
                  {t('clientManagement:filter.apply')}
                </button>
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
              {c.since && <p>{t('clientManagement:card.since', { date: new Date(c.since).toLocaleDateString() })}</p>}
              <p><strong>{t('clientManagement:card.openProfile')}</strong></p>
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

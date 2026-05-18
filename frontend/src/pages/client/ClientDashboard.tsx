import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getMe } from '../../lib/api/usersService';

const STATUS_GUIDE_KEYS = [
  'UNPRICED_PENDING',
  'PRICED_PENDING_CONFIRMATION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const;

const STATUS_FILTER_VALUES = [
  'UNPRICED_PENDING',
  'PRICED_PENDING_CONFIRMATION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const;

interface DisplayOrder {
  id: string;
  product: string;
  status: string;
  orderDate: string;
  deliveryDate: string;
  total: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTotal(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientDashboard() {
  return (
    <Suspense fallback={null}>
      <ClientDashboardInner />
    </Suspense>
  );
}

function ClientDashboardInner() {
  const { t } = useTranslation(['common', 'clientDashboard']);
  const { navigateTopLevel } = useNavigation();

  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingQuote: 0,
    inProgress: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, ordersRes] = await Promise.all([getMe(), getOrders()]);

        const user = userRes.data.data;
        setClientName([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email);
        setClientEmail(user.email);
        setClientPhone(user.phone || '');

        const allOrders = ordersRes.data.data;

        const displayOrders: DisplayOrder[] = allOrders.map((o: any) => ({
          id: String(o.id),
          product: o.upload?.file_name || `Order #${o.id}`,
          status: o.status,
          orderDate: formatDate(o.created_at),
          deliveryDate: formatDate(o.due_date || null),
          total: formatTotal(o.total_price),
        }));

        setOrders(displayOrders);

        setStats({
          totalOrders: displayOrders.length,
          pendingQuote: allOrders.filter((o: any) => o.status === 'UNPRICED_PENDING').length,
          inProgress: allOrders.filter((o: any) => o.status === 'IN_PROGRESS').length,
          completed: allOrders.filter((o: any) => o.status === 'COMPLETED').length,
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError(t('clientDashboard:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = orders.filter((o) => {
    const matchQ = !query || o.id.toLowerCase().includes(query.toLowerCase()) || o.product.toLowerCase().includes(query.toLowerCase());
    const matchS = !filterStatus || o.status === filterStatus;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <AppShell role="client" activePage="client-dashboard">
        <Topbar title={t('clientDashboard:title')} />
        <div className="loading-state">{t('clientDashboard:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="client-dashboard">
      <Topbar title={t('clientDashboard:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="welcome">
        <h2>{t('clientDashboard:welcome.greeting', { name: clientName })}</h2>
        <p>{t('clientDashboard:welcome.sub')}</p>
        <div className="client-info" style={{ marginTop: 8 }}>
          <span>📧 {clientEmail}</span>
          {clientPhone && <span>📞 {clientPhone}</span>}
        </div>
      </section>

      <section className="grid-4">
        <StatCard label={t('clientDashboard:stats.totalOrders')}  value={stats.totalOrders}  sub={t('clientDashboard:stats.allTime')} />
        <StatCard label={t('clientDashboard:stats.pendingQuote')} value={stats.pendingQuote} sub={t('clientDashboard:stats.awaitingPricing')} />
        <StatCard label={t('clientDashboard:stats.inProgress')}   value={stats.inProgress}   sub={t('clientDashboard:stats.inProduction')} />
        <StatCard label={t('clientDashboard:stats.completed')}    value={stats.completed}    sub={t('clientDashboard:stats.successCompleted')} />
      </section>

      <section className="content">
        <article className="table-wrap">
          <div className="table-head">
            <h3>{t('clientDashboard:orders.title')}</h3>
            <div className="search-container">
              <input
                className="input"
                type="search"
                placeholder={t('clientDashboard:orders.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="filter-icon" type="button" onClick={() => setDropdownOpen((o) => !o)}>▼</button>
              {dropdownOpen && (
                <div className="filter-dropdown show">
                  <div className="field">
                    <label>{t('common:filter.status')}</label>
                    <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">{t('common:filter.allStatus')}</option>
                      {STATUS_FILTER_VALUES.map((v) => (
                        <option key={v} value={v}>{t(`common:status.${v}`)}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>{t('common:filter.apply')}</button>
                </div>
              )}
            </div>
          </div>

          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('clientDashboard:table.id')}</th>
                <th>{t('clientDashboard:table.product')}</th>
                <th>{t('clientDashboard:table.status')}</th>
                <th>{t('clientDashboard:table.orderDate')}</th>
                <th>{t('clientDashboard:table.deliveryDate')}</th>
                <th>{t('clientDashboard:table.total')}</th>
                <th>{t('clientDashboard:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="no-results">{t('clientDashboard:orders.noResults')}</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td>{o.product}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.orderDate}</td>
                    <td>{o.deliveryDate}</td>
                    <td>{o.total}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => navigateTopLevel(`/client/orders/${o.id}`)}>{t('clientDashboard:table.view')}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>{t('clientDashboard:quickActions.title')}</h3>
            <button className="btn block primary" onClick={() => navigateTopLevel('place-new-order')}>{t('clientDashboard:quickActions.placeOrder')}</button>
            <button className="btn block" onClick={() => navigateTopLevel('quotes')}>{t('clientDashboard:quickActions.viewQuotes')}</button>
            <button className="btn block" onClick={() => navigateTopLevel('support')}>{t('clientDashboard:quickActions.contactSupport')}</button>
          </section>

          <section className="box">
            <h3>{t('clientDashboard:statusGuide.title')}</h3>
            <ul className="status-list">
              {STATUS_GUIDE_KEYS.map((key) => (
                <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StatusBadge status={key} />
                  <span className="status-desc">{t(`clientDashboard:statusGuide.desc.${key}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </AppShell>
  );
}

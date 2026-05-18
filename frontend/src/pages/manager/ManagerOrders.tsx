import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Props { role?: 'manager' | 'owner'; }

interface DisplayOrder {
  id: string;
  displayId: string;
  status: string;
  client: string;
  completedAt?: string;
}

function formatDate(isoDate: string | null, lang: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ManagerOrders({ role = 'manager' }: Props) {
  return (
    <Suspense fallback={null}>
      <ManagerOrdersInner role={role} />
    </Suspense>
  );
}

function ManagerOrdersInner({ role = 'manager' }: Props) {
  const { t, i18n } = useTranslation(['common', 'managerOrders']);
  const { navigateTopLevel } = useNavigation();
  const [pending, setPending] = useState<DisplayOrder[]>([]);
  const [working, setWorking] = useState<DisplayOrder[]>([]);
  const [completed, setCompleted] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, clientsRes] = await Promise.all([getOrders(), getClients()]);
        const orders: any[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

        const displayOrders: DisplayOrder[] = orders.map((order: any) => ({
          id: String(order.id),
          displayId: `#${order.id}`,
          status: order.status,
          client: clientMap.get(order.customer) || 'Unknown',
          completedAt:
            order.status === 'COMPLETED' || order.status === 'CANCELED'
              ? formatDate(order.updated_at, i18n.language)
              : undefined,
        }));

        setPending(displayOrders.filter((o) => o.status === 'UNPRICED_PENDING' || o.status === 'PRICED_PENDING_CONFIRMATION'));
        setWorking(displayOrders.filter((o) => o.status === 'IN_PROGRESS'));
        setCompleted(displayOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELED'));
      } catch (err: any) {
        console.error('Failed to load orders:', err);
        setError(t('managerOrders:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activePage = role === 'owner' ? 'owner-dashboard' : 'manager-orders';

  if (loading) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('managerOrders:title')} />
        <div className="loading-state">{t('managerOrders:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role={role} activePage={activePage}>
        <Topbar title={t('managerOrders:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} activePage={activePage}>
      <Topbar title={t('managerOrders:title')} />

      <section className="grid-2">
        <article className="table-wrap">
          <div className="table-head"><h3>{t('managerOrders:pending.title')}</h3></div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:table.order')}</th>
                <th>{t('managerOrders:table.status')}</th>
                <th>{t('managerOrders:table.client')}</th>
                <th>{t('managerOrders:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((o) => (
                <tr key={o.id}>
                  <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel(`/manager/orders/${o.id}`)}>
                      {t('managerOrders:table.view')}
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={4} className="no-results">{t('managerOrders:pending.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="table-wrap">
          <div className="table-head"><h3>{t('managerOrders:working.title')}</h3></div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('managerOrders:table.order')}</th>
                <th>{t('managerOrders:table.status')}</th>
                <th>{t('managerOrders:table.client')}</th>
                <th>{t('managerOrders:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {working.map((o) => (
                <tr key={o.id}>
                  <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.client}</td>
                  <td>
                    <button className="btn" onClick={() => navigateTopLevel('/manager/work-view')}>
                      {t('managerOrders:working.workView')}
                    </button>
                  </td>
                </tr>
              ))}
              {working.length === 0 && (
                <tr><td colSpan={4} className="no-results">{t('managerOrders:working.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-wrap" style={{ marginTop: 12 }}>
        <div className="table-head"><h3>{t('managerOrders:completed.title')}</h3></div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('managerOrders:table.order')}</th>
              <th>{t('managerOrders:table.status')}</th>
              <th>{t('managerOrders:table.client')}</th>
              <th>{t('managerOrders:completed.completedAt')}</th>
              <th>{t('managerOrders:table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((o) => (
              <tr key={o.id}>
                <td>{o.displayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({o.id})</span></td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.client}</td>
                <td>{o.completedAt || '—'}</td>
                <td>
                  <button className="btn" onClick={() => navigateTopLevel(`/manager/orders/${o.id}`)}>
                    {t('managerOrders:table.view')}
                  </button>
                </td>
              </tr>
            ))}
            {completed.length === 0 && (
              <tr><td colSpan={5} className="no-results">{t('managerOrders:completed.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

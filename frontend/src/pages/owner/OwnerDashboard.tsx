import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { BatchLookupPanel, AccountingPanel, SettingsPanel, ProductionPanel, ManagerOrdersPanel } from './OwnerPanels';
import type { ManagerOrdersFilter } from './OwnerPanels';
import { getDashboardStats } from '../../lib/api/dashboardService';
import { getOrders } from '../../lib/api';

interface Stat {
  labelKey: string;
  value: string | number;
  subKey: string;
}

interface QuickList {
  listKey: 'pending' | 'working' | 'completed';
  count: number;
  status: string;
  page: string;
}

type FloatingView = 'accounting' | 'batch-lookup' | 'settings' | 'production' | 'manager-orders';

export default function OwnerDashboard() {
  return (
    <Suspense fallback={null}>
      <OwnerDashboardInner />
    </Suspense>
  );
}

function OwnerDashboardInner() {
  const { t } = useTranslation(['common', 'ownerDashboard']);
  const [stats, setStats] = useState<Stat[]>([]);
  const [quickLists, setQuickLists] = useState<QuickList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floatingView, setFloatingView] = useState<FloatingView | null>(null);
  const [managerOrdersFilter, setManagerOrdersFilter] = useState<ManagerOrdersFilter>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await getDashboardStats();
        const ordersRes = await getOrders();
        const dashboardStats = statsRes.data.data;
        console.log('Dashboard stats response:', dashboardStats);
        const orders = ordersRes.data.data;

        const pendingOrders = orders.filter((order: any) =>
          ['UNPRICED_PENDING', 'PRICED_PENDING_CONFIRMATION'].includes(String(order.status ?? '').toUpperCase())
        ).length;
        const unpricedOrders = dashboardStats.orders?.unpriced_orders ?? 0;
        const activeJobs = dashboardStats.production?.total_items ?? 0;
        const totalRevenue = dashboardStats.payments?.total_paid_amount ?? 0;
        const accountingItems = dashboardStats.payments?.unpaid_orders ?? 0;

        const revenueFormatted = totalRevenue >= 1000
          ? `EGP ${(totalRevenue / 1000).toFixed(0)}K`
          : `EGP ${totalRevenue.toFixed(0)}`;

        setStats([
          { labelKey: 'unpricedOrders', value: unpricedOrders, subKey: 'unpricedOrdersSub' },
          { labelKey: 'activeJobs', value: activeJobs, subKey: 'activeJobsSub' },
          { labelKey: 'revenueSnapshot', value: revenueFormatted, subKey: 'revenueSnapshotSub' },
          { labelKey: 'accountingItems', value: accountingItems, subKey: 'accountingItemsSub' },
        ]);

        const workingOrders = dashboardStats.production?.total_items ?? 0;
        const completedOrders = dashboardStats.orders?.completed_orders ?? 0;

        setQuickLists([
          { listKey: 'pending', count: pendingOrders, status: 'awaiting_work', page: 'owner-manager-orders' },
          { listKey: 'working', count: workingOrders, status: 'in_production', page: 'owner-production' },
          { listKey: 'completed', count: completedOrders, status: 'ready_for_archive', page: 'owner-completed-jobs' },
        ]);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(t('ownerDashboard:error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuickListOpen = (page: string) => {
    if (page === 'owner-manager-orders') {
      setManagerOrdersFilter('pending');
      setFloatingView('manager-orders');
      return;
    }
    if (page === 'owner-production')     { setFloatingView('production'); return; }
    if (page === 'owner-completed-jobs') {
      setManagerOrdersFilter('completed');
      setFloatingView('manager-orders');
      return;
    }
  };

  const openManagerOrders = (filter: ManagerOrdersFilter = 'all') => {
    setManagerOrdersFilter(filter);
    setFloatingView('manager-orders');
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-dashboard">
        <Topbar title={t('ownerDashboard:title')} />
        <section className="welcome">
          <h2>{t('ownerDashboard:welcome.heading')}</h2>
          <p>{t('ownerDashboard:welcome.subtext')}</p>
        </section>
        <div className="loading-state">{t('ownerDashboard:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-dashboard">
        <Topbar title={t('ownerDashboard:title')} />
        <section className="welcome">
          <h2>{t('ownerDashboard:welcome.heading')}</h2>
          <p>{t('ownerDashboard:welcome.subtext')}</p>
        </section>
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-dashboard">
      <Topbar title={t('ownerDashboard:title')} />

      <section className="welcome">
        <h2>{t('ownerDashboard:welcome.heading')}</h2>
        <p>{t('ownerDashboard:welcome.subtext')}</p>
      </section>

      <section className="grid-4">
        {stats.map((stat, idx) => (
          <StatCard
            key={idx}
            label={t(`ownerDashboard:stats.${stat.labelKey}`)}
            value={stat.value}
            sub={t(`ownerDashboard:stats.${stat.subKey}`)}
          />
        ))}
      </section>

      <section className="content">
        <article className="table-wrap">
          <div className="table-head">
            <h3>{t('ownerDashboard:quickLists.title')}</h3>
            <div className="actions-inline">
              <button className="btn" onClick={() => openManagerOrders('all')}>
                {t('ownerDashboard:quickLists.openManagerOrders')}
              </button>
              <button className="btn primary" onClick={() => setFloatingView('accounting')}>
                {t('ownerDashboard:quickLists.goToAccounting')}
              </button>
            </div>
          </div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('ownerDashboard:quickLists.columns.list')}</th>
                <th>{t('ownerDashboard:quickLists.columns.count')}</th>
                <th>{t('ownerDashboard:quickLists.columns.status')}</th>
                <th>{t('ownerDashboard:quickLists.columns.ownerAction')}</th>
                <th>{t('ownerDashboard:quickLists.columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {quickLists.map((r) => (
                <tr key={r.listKey}>
                  <td>{t(`ownerDashboard:quickLists.${r.listKey}.label`)}</td>
                  <td>{r.count}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{t(`ownerDashboard:quickLists.${r.listKey}.action`)}</td>
                  <td>
                    <button className="btn" onClick={() => handleQuickListOpen(r.page)}>
                      {t('ownerDashboard:quickLists.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>{t('ownerDashboard:quickActions.title')}</h3>
            <button className="btn block" onClick={() => openManagerOrders('all')}>
              {t('ownerDashboard:quickActions.openManagerOrders')}
            </button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => setFloatingView('batch-lookup')}>
              {t('ownerDashboard:quickActions.batchLookup')}
            </button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => setFloatingView('settings')}>
              {t('ownerDashboard:quickActions.updateRoles')}
            </button>
          </section>
          <section className="box">
            <h3>{t('ownerDashboard:accountingInfo.title')}</h3>
            <ul>
              <li>{t('ownerDashboard:accountingInfo.item1')}</li>
              <li>{t('ownerDashboard:accountingInfo.item2')}</li>
              <li>{t('ownerDashboard:accountingInfo.item3')}</li>
            </ul>
          </section>
        </div>
      </section>

      {floatingView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '32px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setFloatingView(null); }}
        >
          <div style={{
            background: 'var(--surface, #fff)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 980,
            boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border, #e4e6eb)',
              position: 'sticky',
              top: 0,
              background: 'var(--surface, #fff)',
              zIndex: 1,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {floatingView === 'accounting'     && t('ownerDashboard:panels.accounting')}
                {floatingView === 'batch-lookup'   && t('ownerDashboard:panels.batchLookup')}
                {floatingView === 'settings'       && t('ownerDashboard:panels.rolesNotifications')}
                {floatingView === 'production'     && t('ownerDashboard:panels.production')}
                {floatingView === 'manager-orders' && t('ownerDashboard:panels.managerOrders')}
              </h2>
              <button
                onClick={() => setFloatingView(null)}
                style={{
                  padding: '5px 14px',
                  background: '#2f3640',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {t('ownerDashboard:panels.close')}
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {floatingView === 'accounting'     && <AccountingPanel />}
              {floatingView === 'batch-lookup'   && <BatchLookupPanel />}
              {floatingView === 'settings'       && <SettingsPanel />}
              {floatingView === 'production'     && <ProductionPanel />}
              {floatingView === 'manager-orders' && <ManagerOrdersPanel initialFilter={managerOrdersFilter} />}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

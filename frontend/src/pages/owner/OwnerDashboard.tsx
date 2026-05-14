import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { BatchLookupPanel, AccountingPanel, SettingsPanel, ProductionPanel, CompletedJobsPanel, ManagerOrdersPanel } from './OwnerPanels';

interface Stat {
  label: string;
  value: string | number;
  sub: string;
}

interface QuickList {
  list: string;
  count: number;
  status: string;
  action: string;
  page: string;
}

type FloatingView = 'accounting' | 'batch-lookup' | 'settings' | 'production' | 'completed-jobs' | 'manager-orders';

// Normalized data interfaces
interface Order {
  id: string;
  clientId: string;
  status: string;
  total: number | null;
}

interface Batch {
  id: string;
  orderId: string;
  status: string;  // 'in_progress', 'completed', 'pending_approval', etc.
}

interface Invoice {
  id: string;
  amount: number;
  status: string;  // 'paid', 'pending', 'unpaid', 'overdue'
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [quickLists, setQuickLists] = useState<QuickList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floatingView, setFloatingView] = useState<FloatingView | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/json/orders.json').then(res => res.json()),
      fetch('/data/json/batches.json').then(res => res.json()),
      fetch('/data/json/invoices.json').then(res => res.json())
    ])
      .then(([ordersData, batchesData, invoicesData]) => {
        const orders: Order[] = ordersData;
        const batches: Batch[] = batchesData;
        const invoices: Invoice[] = invoicesData;

        // ---------- Compute stats ----------
        // 1. Unpriced Orders: orders with status 'unpriced_pending'
        const unpricedCount = orders.filter(o => o.status === 'unpriced_pending').length;

        // 2. Active Jobs: batches that are not completed and not canceled
        const activeJobs = batches.filter(b => b.status !== 'completed' && b.status !== 'canceled').length;

        // 3. Revenue Snapshot: sum of all paid invoices (current month? For simplicity, total paid)
        const totalPaid = invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0);
        const revenueFormatted = totalPaid >= 1000 
          ? `EGP ${(totalPaid / 1000).toFixed(0)}K` 
          : `EGP ${totalPaid.toFixed(0)}`;

        // 4. Accounting Items: invoices not paid (pending, unpaid, overdue)
        const accountingItems = invoices.filter(inv => inv.status !== 'paid').length;

        setStats([
          { label: 'Unpriced Orders', value: unpricedCount, sub: 'Need manager pricing' },
          { label: 'Active Jobs', value: activeJobs, sub: 'Production in progress' },
          { label: 'Revenue Snapshot', value: revenueFormatted, sub: 'Total paid invoices' },
          { label: 'Accounting Items', value: accountingItems, sub: 'Need finance follow-up' }
        ]);

        // ---------- Compute quick lists ----------
        // Pending Orders: unpriced_pending + priced_pending_confirmation
        const pendingOrders = orders.filter(o => 
          o.status === 'unpriced_pending' || o.status === 'priced_pending_confirmation'
        ).length;

        // Working Orders: orders with status 'in_progress' (could also match batches in progress)
        const workingOrders = orders.filter(o => o.status === 'in_progress').length;

        // Completed Orders: orders with status 'completed' or 'canceled'
        const completedOrders = orders.filter(o => 
          o.status === 'completed' || o.status === 'canceled'
        ).length;

        setQuickLists([
          {
            list: 'Pending Orders',
            count: pendingOrders,
            status: 'awaiting_work',
            action: 'Review and price urgent batches',
            page: 'owner-manager-orders'
          },
          {
            list: 'Working Orders',
            count: workingOrders,
            status: 'in_production',
            action: 'Track production progress',
            page: 'owner-production'
          },
          {
            list: 'Completed Orders',
            count: completedOrders,
            status: 'ready_for_archive',
            action: 'Validate completion and billing',
            page: 'owner-completed-jobs'
          }
        ]);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load normalized data:', err);
        setError('Could not load dashboard data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const handleQuickListOpen = (page: string) => {
    if (page === 'owner-manager-orders') { setFloatingView('manager-orders'); return; }
    if (page === 'owner-production')     { setFloatingView('production'); return; }
    if (page === 'owner-completed-jobs') { setFloatingView('completed-jobs'); return; }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-dashboard">
        <Topbar title="Owner Dashboard" />
        <section className="welcome">
          <h2>Operations snapshot</h2>
          <p>Monitor order flow, production load, and accounting status.</p>
        </section>
        <div className="loading-state">Loading dashboard data...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-dashboard">
        <Topbar title="Owner Dashboard" />
        <section className="welcome">
          <h2>Operations snapshot</h2>
          <p>Monitor order flow, production load, and accounting status.</p>
        </section>
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-dashboard">
      <Topbar title="Owner Dashboard" />

      <section className="welcome">
        <h2>Operations snapshot</h2>
        <p>Monitor order flow, production load, and accounting status.</p>
      </section>

      <section className="grid-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} label={stat.label} value={stat.value} sub={stat.sub} />
        ))}
      </section>

      <section className="content">
        <article className="table-wrap">
          <div className="table-head">
            <h3>Manager Quick Lists</h3>
            <div className="actions-inline">
              <button
                className="btn"
                onClick={() => setFloatingView('manager-orders')}
              >
                Open Manager Orders
              </button>
              <button className="btn primary" onClick={() => setFloatingView('accounting')}>Go to Accounting</button>
            </div>
          </div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>List</th>
                <th>Count</th>
                <th>Status</th>
                <th>Owner Action</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quickLists.map((r) => (
                <tr key={r.list}>
                  <td>{r.list}</td>
                  <td>{r.count}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.action}</td>
                  <td><button className="btn" onClick={() => handleQuickListOpen(r.page)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>Quick Actions</h3>
            <button
              className="btn block"
              onClick={() => setFloatingView('manager-orders')}
            >
              Open Order Details
            </button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => setFloatingView('batch-lookup')}>Batch Lookup and Export</button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => setFloatingView('settings')}>Update Roles &amp; Notifications</button>
          </section>
          <section className="box">
            <h3>Accounting</h3>
            <ul>
              <li>Revenue section links directly to the accounting page.</li>
              <li>Invoices are managed under accounting records.</li>
              <li>Owner dashboard is now focused on operations and finance routing.</li>
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
                {floatingView === 'accounting'     && 'Accounting'}
                {floatingView === 'batch-lookup'   && 'Batch Lookup & Export'}
                {floatingView === 'settings'       && 'Roles & Notifications'}
                {floatingView === 'production'     && 'Production Overview'}
                {floatingView === 'completed-jobs' && 'Completed Jobs'}
                {floatingView === 'manager-orders' && 'Manager Orders'}
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
                ✕ Close
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {floatingView === 'accounting'     && <AccountingPanel />}
              {floatingView === 'batch-lookup'   && <BatchLookupPanel />}
              {floatingView === 'settings'       && <SettingsPanel />}
              {floatingView === 'production'     && <ProductionPanel />}
              {floatingView === 'completed-jobs' && <CompletedJobsPanel />}
              {floatingView === 'manager-orders' && <ManagerOrdersPanel />}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
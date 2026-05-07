import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

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

export default function OwnerDashboard() {
  const { navigateTopLevel } = useNavigation();
  const [stats, setStats] = useState<Stat[]>([]);
  const [quickLists, setQuickLists] = useState<QuickList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch both stats and quick lists in parallel
    Promise.all([
      fetch('/data/dashboard-stats.json').then(res => {
        if (!res.ok) throw new Error(`Stats HTTP ${res.status}`);
        return res.json();
      }),
      fetch('/data/quick-lists.json').then(res => {
        if (!res.ok) throw new Error(`Quick lists HTTP ${res.status}`);
        return res.json();
      })
    ])
      .then(([statsData, quickListsData]) => {
        setStats(statsData);
        setQuickLists(quickListsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        setError('Could not load dashboard data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-dashboard" navigateTopLevel={navigateTopLevel}>
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
      <AppShell role="owner" activePage="owner-dashboard" navigateTopLevel={navigateTopLevel}>
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
    <AppShell role="owner" activePage="owner-dashboard" navigateTopLevel={navigateTopLevel}>
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
              <button className="btn" onClick={() => navigateTopLevel('owner-manager-orders')}>Open Manager Orders</button>
              <button className="btn primary" onClick={() => navigateTopLevel('accounting')}>Go to Accounting</button>
            </div>
          </div>
          <table>
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
                  <td><button className="btn" onClick={() => navigateTopLevel(r.page)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <div className="stack">
          <section className="box">
            <h3>Quick Actions</h3>
            <button className="btn block" onClick={() => navigateTopLevel('owner-manager-orders')}>Open Order Details</button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => navigateTopLevel('owner-batch-lookup')}>Batch Lookup and Export</button>
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => navigateTopLevel('owner-settings')}>Update Roles &amp; Notifications</button>
          </section>
          <section className="box">
            <h3>Accounting Redirect</h3>
            <ul>
              <li>Revenue section links directly to the accounting page.</li>
              <li>Invoices are managed under accounting records.</li>
              <li>Owner dashboard is now focused on operations and finance routing.</li>
            </ul>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
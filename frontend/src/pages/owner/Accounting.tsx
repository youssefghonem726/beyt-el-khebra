import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { downloadText } from '../../utils/download';

interface Props { onNavigate: (page: string) => void; }

interface Invoice {
  id: string;
  order: string;
  client: string;
  total: string;
  status: string;
}

interface Stat {
  label: string;
  value: string | number;
  sub: string;
}

export default function Accounting({ onNavigate }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/invoices.json').then(res => {
        if (!res.ok) throw new Error(`Invoices HTTP ${res.status}`);
        return res.json();
      }),
      fetch('/data/accounting-stats.json').then(res => {
        if (!res.ok) throw new Error(`Stats HTTP ${res.status}`);
        return res.json();
      })
    ])
      .then(([invoicesData, statsData]) => {
        setInvoices(invoicesData);
        setStats(statsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load accounting data:', err);
        setError('Could not load accounting data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role="owner" activePage="accounting" onNavigate={onNavigate}>
        <Topbar title="Accounting Page" userName="Finance Team" />
        <section className="grid-4">
          {/* Show placeholders while loading */}
          <StatCard label="Revenue Snapshot" value="..." sub="Current month" />
          <StatCard label="Pending Collection" value="..." sub="Awaiting payment" />
          <StatCard label="Paid Invoices" value="..." sub="Settled this month" />
          <StatCard label="Unpaid Invoices" value="..." sub="Follow-up required" />
        </section>
        <section className="table-wrap">
          <div className="loading-state">Loading invoices...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="accounting" onNavigate={onNavigate}>
        <Topbar title="Accounting Page" userName="Finance Team" />
        <section className="grid-4">
          <StatCard label="Revenue Snapshot" value="EGP 84K" sub="Current month" />
          <StatCard label="Pending Collection" value="EGP 22K" sub="Awaiting payment" />
          <StatCard label="Paid Invoices" value={61} sub="Settled this month" />
          <StatCard label="Unpaid Invoices" value={9} sub="Follow-up required" />
        </section>
        <section className="table-wrap">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="accounting" onNavigate={onNavigate}>
      <Topbar title="Accounting Page" userName="Finance Team" />
      <section className="grid-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} label={stat.label} value={stat.value} sub={stat.sub} />
        ))}
      </section>
      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoices (moved under Accounting)</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Order</th>
              <th>Client Name</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.order}</td>
                <td>{inv.client}</td>
                <td>{inv.total}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td><button className="btn" onClick={() => downloadText(`invoice-${inv.id}.txt`, [
                  `INVOICE: ${inv.id}`,
                  `Order:   ${inv.order}`,
                  `Client:  ${inv.client}`,
                  `Total:   ${inv.total}`,
                  `Status:  ${inv.status}`,
                ])}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
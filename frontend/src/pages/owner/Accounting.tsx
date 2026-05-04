import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

interface Invoice {
  id: string;
  order: string;
  client: string;
  total: string;
  status: string;
}

export default function Accounting({ onNavigate }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/public/data/invoices.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Invoice[]) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load invoices:', err);
        setError('Could not load invoice data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
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
        <StatCard label="Revenue Snapshot" value="EGP 84K" sub="Current month" />
        <StatCard label="Pending Collection" value="EGP 22K" sub="Awaiting payment" />
        <StatCard label="Paid Invoices" value={61} sub="Settled this month" />
        <StatCard label="Unpaid Invoices" value={9} sub="Follow-up required" />
      </section>
      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoices (moved under Accounting)</h3>
          <button className="btn" onClick={() => onNavigate('owner-dashboard')}>Back to Owner Dashboard</button>
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
                <td><button className="btn">Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
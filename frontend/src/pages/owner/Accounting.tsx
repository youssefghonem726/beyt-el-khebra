import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import SearchFilter from '../../components/SearchFilter';
import ClientSummary from '../../components/ClientSummary';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';

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

export default function Accounting() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

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
        setFilteredInvoices(invoicesData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load accounting data:', err);
        setError('Could not load accounting data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const handleSearch = (query: string, filter: string) => {
    let result = invoices;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(inv =>
        inv.id.toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        inv.order.toLowerCase().includes(q)
      );
    }

    if (filter) {
      result = result.filter(inv => inv.status.toLowerCase() === filter.toLowerCase());
    }

    setFilteredInvoices(result);
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="accounting">
        <Topbar title="Accounting Page" />
        <section className="grid-4">
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
      <AppShell role="owner" activePage="accounting">
        <Topbar title="Accounting Page" />
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
    <AppShell role="owner" activePage="accounting">
      <Topbar title="Accounting Page" />
      <section className="grid-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} label={stat.label} value={stat.value} sub={stat.sub} />
        ))}
      </section>
      <ClientSummary invoices={invoices} />
      <section className="table-wrap">
        <div className="table-head">
          <h3>Invoices</h3>
          <SearchFilter
            placeholder="Search by invoice, client, order..."
            filters={[
              { label: 'Paid', value: 'paid' },
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'Pending', value: 'pending' },
            ]}
            onSearch={handleSearch}
          />
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
            {filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.order}</td>
                <td>{inv.client}</td>
                <td>{inv.total}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <button
                    className="btn"
                    onClick={() => downloadText(`invoice-${inv.id}.txt`, [
                      `INVOICE: ${inv.id}`,
                      `Order:   ${inv.order}`,
                      `Client:  ${inv.client}`,
                      `Total:   ${inv.total}`,
                      `Status:  ${inv.status}`,
                    ])}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

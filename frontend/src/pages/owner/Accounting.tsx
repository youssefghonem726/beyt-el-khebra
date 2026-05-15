import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import SearchFilter from '../../components/SearchFilter';
import ClientSummary from '../../components/ClientSummary';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';
// ─── Replace manual fetch with API services ─────────────────────────────────
import { getInvoices, getClients } from '../../lib/api';
import type { Invoice as ApiInvoice, Client as ApiClient } from '../../lib/api';

// ─── Local types (unchanged) ─────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
}

interface DisplayInvoice {
  id: string;
  order: string;
  client: string;
  total: string;
  status: string;
}

// ─── Helpers (unchanged) ─────────────────────────────────────────────────────
function formatAmount(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getShortOrderId(fullId: string): string {
  const match = fullId.match(/ORD-(\d+)-/);
  return match ? `#${match[1]}` : fullId;
}

export default function Accounting() {
  const { navigateTopLevel } = useNavigation();
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string | number; sub: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredInvoices, setFilteredInvoices] = useState<DisplayInvoice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the API calls – they return AxiosResponse<ApiSuccess<T>>
        const [invRes, clientRes] = await Promise.all([
          getInvoices(),
          getClients(),
        ]);

        const rawInvoices: ApiInvoice[] = invRes.data.data;
        const apiClients: ApiClient[] = clientRes.data.data.results;
        
        // Build a client name map (we only need id → name)
        const clientMap: Record<string, string> = {};
        apiClients.forEach(c => {
          clientMap[c.id] = c.name;
        });

        // Map to DisplayInvoice list
        const displayList: DisplayInvoice[] = rawInvoices.map(inv => ({
          id: inv.id,
          order: getShortOrderId(inv.orderId),
          client: clientMap[inv.clientId] || 'Unknown Client',
          total: formatAmount(inv.amount),
          status: inv.status,
        }));

        // Compute financial stats from raw invoices
        const totalPaid = rawInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const pendingUnpaid = rawInvoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const paidCount = rawInvoices.filter(inv => inv.status === 'paid').length;
        const unpaidCount = rawInvoices.filter(inv => inv.status !== 'paid').length;

        const formatLarge = (num: number): string => {
          if (num >= 1_000_000) return `EGP ${(num / 1_000_000).toFixed(0)}M`;
          if (num >= 1_000) return `EGP ${(num / 1_000).toFixed(0)}K`;
          return `EGP ${num.toFixed(0)}`;
        };

        const computedStats = [
          { label: 'Revenue Snapshot', value: formatLarge(totalPaid), sub: 'Total paid invoices' },
          { label: 'Pending Collection', value: formatLarge(pendingUnpaid), sub: 'Awaiting payment' },
          { label: 'Paid Invoices', value: paidCount, sub: 'Paid to date' },
          { label: 'Unpaid Invoices', value: unpaidCount, sub: 'Follow-up required' },
        ];

        setInvoices(displayList);
        setStats(computedStats);
        setFilteredInvoices(displayList);
      } catch (err) {
        console.error('Failed to load accounting data:', err);
        setError('Could not load accounting data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // ─── Loading / Error / Normal render (identical structure) ─────────────────
  if (loading) {
    return (
      <AppShell role="owner" activePage="accounting">
        <Topbar title="Accounting Page" />
        <section className="grid-4">
          <StatCard label="Revenue Snapshot" value="..." sub="Total paid invoices" />
          <StatCard label="Pending Collection" value="..." sub="Awaiting payment" />
          <StatCard label="Paid Invoices" value="..." sub="Paid to date" />
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
          <StatCard label="Revenue Snapshot" value="EGP 84K" sub="Total paid invoices" />
          <StatCard label="Pending Collection" value="EGP 22K" sub="Awaiting payment" />
          <StatCard label="Paid Invoices" value={61} sub="Paid to date" />
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
              { label: 'Overdue', value: 'overdue' },
            ]}
            onSearch={handleSearch}
          />
        </div>
        <table className="orders-table">
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
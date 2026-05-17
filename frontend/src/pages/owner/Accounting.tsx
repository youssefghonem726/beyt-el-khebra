import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import SearchFilter from '../../components/SearchFilter';
import ClientSummary from '../../components/ClientSummary';
import { downloadText } from '../../utils/download';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getInvoices } from '../../lib/api/invoicesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

// ─── Types ─────────────────────────────────────────────────────────────────
interface BackendInvoice {
  id: number;
  created_at: string;
  order_id: number | null;
  client_id: number | null;
  due_date: string;        // time string
  paid_date: string | null;
  total_amount: number | null;
  status: string | null;   // e.g. 'paid','unpaid','pending','overdue'
  Notes: string | null;
}

interface DisplayInvoice {
  id: string;            // invoice id as string
  order: string;         // e.g. "#1021"
  client: string;
  total: string;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getShortOrderId(orderId: number | null): string {
  if (orderId == null) return '—';
  return `#${orderId}`;
}

// ─── Component ──────────────────────────────────────────────────────────────
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
        const [invRes, clientRes] = await Promise.all([
          getInvoices(),
          getClients(),
        ]);

        const rawInvoices: BackendInvoice[] = invRes.data.data;
        const clients = clientRes.data.data.results;   // array of UserProfile (id, first_name, last_name, email)

        console.log('Accounting - raw invoices:', rawInvoices);
        console.log('Accounting - clients:', clients);

        // Build client name map (combine first + last name, fallback to email)
        const clientMap = new Map(
          clients.map((c: any) => [
            c.id,
            [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email,
          ])
        );

        // Map invoices to display
        const displayList: DisplayInvoice[] = rawInvoices.map((inv) => ({
          id: String(inv.id),
          order: getShortOrderId(inv.order_id),
          client: clientMap.get(inv.client_id) || 'Unknown',
          total: formatAmount(inv.total_amount),
          status: inv.status || '—',
        }));

        // Compute financial stats
        const totalPaid = rawInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);

        const pendingUnpaid = rawInvoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);

        const paidCount = rawInvoices.filter(inv => inv.status === 'paid').length;
        const unpaidCount = rawInvoices.filter(inv => inv.status !== 'paid').length;

        const formatLarge = (num: number): string => {
          if (num >= 1_000_000) return `EGP ${(num / 1_000_000).toFixed(0)}M`;
          if (num >= 1_000) return `EGP ${(num / 1_000).toFixed(0)}K`;
          return `EGP ${num.toFixed(0)}`;
        };

        setStats([
          { label: 'Revenue Snapshot', value: formatLarge(totalPaid), sub: 'Total paid invoices' },
          { label: 'Pending Collection', value: formatLarge(pendingUnpaid), sub: 'Awaiting payment' },
          { label: 'Paid Invoices', value: paidCount, sub: 'Paid to date' },
          { label: 'Unpaid Invoices', value: unpaidCount, sub: 'Follow-up required' },
        ]);

        setInvoices(displayList);
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

  // ─── Render ──────────────────────────────────────────────────────────────
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
          <StatCard label="Revenue Snapshot" value="—" sub="Total paid invoices" />
          <StatCard label="Pending Collection" value="—" sub="Awaiting payment" />
          <StatCard label="Paid Invoices" value="—" sub="Paid to date" />
          <StatCard label="Unpaid Invoices" value="—" sub="Follow-up required" />
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
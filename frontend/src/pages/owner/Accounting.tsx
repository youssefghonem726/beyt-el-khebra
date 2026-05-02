import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

const INVOICES = [
  { id: 'INV-9511', order: '#1033', client: 'Client Name', total: 'EGP 2,850.00', status: 'UNPAID' },
  { id: 'INV-9507', order: '#1029', client: 'Retail Plus', total: 'EGP 3,120.00', status: 'PAID' },
];

export default function Accounting({ onNavigate }: Props) {
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
          <thead><tr><th>Invoice #</th><th>Order</th><th>Client Name</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {INVOICES.map((inv) => (
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

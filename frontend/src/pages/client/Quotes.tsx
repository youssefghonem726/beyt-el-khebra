import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

const QUOTES = [
  { id: 'Q-211', order: '#1021', status: 'Awaiting Confirmation', amount: 'EGP 1,200.00', action: { label: 'Review', page: 'unpriced-queue' } },
  { id: 'Q-208', order: '#1018', status: 'Approved', amount: 'EGP 950.00', action: { label: 'Invoice', page: 'client-invoices' } },
];

export default function Quotes({ onNavigate }: Props) {
  return (
    <AppShell role="client" activePage="quotes" onNavigate={onNavigate}>
      <Topbar title="Quotes" userName="Client Name" />
      <section className="table-wrap">
        <h3>Pending &amp; Approved Quotes</h3>
        <table>
          <thead><tr><th>Quote ID</th><th>Order</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead>
          <tbody>
            {QUOTES.map((q) => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.order}</td>
                <td><StatusBadge status={q.status} /></td>
                <td>{q.amount}</td>
                <td><button className="btn" onClick={() => onNavigate(q.action.page)}>{q.action.label}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

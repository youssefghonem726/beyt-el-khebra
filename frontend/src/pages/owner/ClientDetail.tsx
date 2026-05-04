import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';

interface Props {
  onNavigate: (page: string) => void;
  clientId?: string;
}

const CLIENTS: Record<string, {
  name: string; phone: string; address: string; email: string;
  stats: { label: string; value: string }[];
  orders: { id: string; product: string; status: string; date: string; total: string }[];
}> = {
  'client-detail-ahmed': {
    name: 'Ahmed Store', phone: '+20 101 000 1021', address: '15 Tahrir Street, Cairo, Egypt', email: 'ahmed@store.com',
    stats: [{ label: 'Total Number of Orders', value: '24' }, { label: 'Average Order Price', value: 'EGP 1,850' }, { label: 'Customer Since', value: '2 years, 4 months' }, { label: 'Total Amount Spent', value: 'EGP 44,400' }],
    orders: [{ id: '#1021', product: 'Business Cards', status: 'PRICED_PENDING_CONFIRMATION', date: '21 Apr 2025', total: 'EGP 1,200.00' }, { id: '#1020', product: 'Flyers A5', status: 'IN_PROGRESS', date: '18 Apr 2025', total: 'EGP 2,400.00' }, { id: '#1018', product: 'Stickers', status: 'COMPLETED', date: '15 Apr 2025', total: 'EGP 950.00' }],
  },
  'client-detail-design-hub': {
    name: 'Design Hub', phone: '+20 100 222 3100', address: '7 Smart Village, Giza, Egypt', email: 'info@designhub.com',
    stats: [{ label: 'Total Number of Orders', value: '16' }, { label: 'Average Order Price', value: 'EGP 2,050' }, { label: 'Customer Since', value: '1 year, 8 months' }, { label: 'Total Amount Spent', value: 'EGP 32,800' }],
    orders: [{ id: '#1112', product: 'Catalogs', status: 'COMPLETED', date: '10 Apr 2025', total: 'EGP 3,000.00' }, { id: '#1101', product: 'Posters A3', status: 'COMPLETED', date: '2 Apr 2025', total: 'EGP 1,500.00' }],
  },
  'client-detail-retail-plus': {
    name: 'Retail Plus', phone: '+20 122 777 4400', address: '42 Corniche Road, Alexandria, Egypt', email: 'contact@retailplus.com',
    stats: [{ label: 'Total Number of Orders', value: '11' }, { label: 'Average Order Price', value: 'EGP 1,420' }, { label: 'Customer Since', value: '11 months' }, { label: 'Total Amount Spent', value: 'EGP 15,620' }],
    orders: [{ id: '#1096', product: 'Shelf Labels', status: 'IN_PROGRESS', date: '20 Apr 2025', total: 'EGP 1,800.00' }, { id: '#1090', product: 'Price Stickers', status: 'COMPLETED', date: '10 Apr 2025', total: 'EGP 950.00' }],
  },
};

export default function ClientDetail({ onNavigate, clientId = 'client-detail-ahmed' }: Props) {
  const client = CLIENTS[clientId] ?? CLIENTS['client-detail-ahmed'];

  return (
    <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
      <header className="topbar">
        <h1>Client Details - {client.name}</h1>
        <button className="btn" onClick={() => onNavigate('client-management')}>Back to Client Management</button>
      </header>

      <section className="box">
        <div className="form-grid-2">
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Phone Number:</strong> {client.phone}</p>
          <p><strong>Address:</strong> {client.address}</p>
          <p><strong>Email:</strong> {client.email}</p>
        </div>
        <div className="line" />
        <div className="stats-grid">
          {client.stats.map((s) => (
            <div key={s.label} className="stat-item">
              <p>{s.label}</p>
              <h4>{s.value}</h4>
            </div>
          ))}
        </div>
      </section>

      <section className="table-wrap" style={{ marginTop: 14 }}>
        <h3>Past Orders</h3>
        <table>
          <thead><tr><th>Order ID</th><th>Product</th><th>Status</th><th>Date</th><th>Total</th></tr></thead>
          <tbody>
            {client.orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.product}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.date}</td>
                <td>{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
interface ClientDetail {
  id: string;                  
  name: string;
  phone: string;
  address: string;
  email: string;
  stats: { label: string; value: string }[];
  orders: {
    id: string;
    product: string;
    status: string;
    date: string;
    total: string;
  }[];
}

export default function ClientDetail() {
  const { id: clientId = 'client-detail-ahmed' } = useParams<{ id: string }>();
  const { navigateTopLevel } = useNavigation();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/clients-detail.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ClientDetail[]) => {
        const found = data.find((c) => c.id === clientId);
        if (found) {
          setClient(found);
        } else {
          setError(`Client with ID "${clientId}" not found.`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load client details:', err);
        setError('Could not load client data. Please try again later.');
        setLoading(false);
      });
  }, [clientId]); 

  if (loading) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar">
          <h1>Client Details</h1>
        </header>
        <section className="box">
          <div className="loading-state">Loading client details...</div>
        </section>
      </AppShell>
    );
  }

  if (error || !client) {
    return (
      <AppShell role="owner" activePage="client-management">
        <header className="topbar">
          <h1>Client Details</h1>
        </header>
        <section className="box">
          <div className="error-state">{error || 'Client data unavailable.'}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="client-management">
      <header className="topbar">
        <h1>Client Details - {client.name}</h1>
        <button className="btn" onClick={() => navigateTopLevel('client-management')}>Back to Client Management</button>
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
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
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
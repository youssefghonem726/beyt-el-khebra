import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';

interface Props {
  onNavigate: (page: string) => void;
  clientId?: string;
}

// Define the shape of a client object from the JSON file
interface ClientDetail {
  id: string;                  // matches page identifier e.g. 'client-detail-ahmed'
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

export default function ClientDetail({ onNavigate, clientId = 'client-detail-ahmed' }: Props) {
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
      <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
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
      <AppShell role="owner" activePage="client-management" onNavigate={onNavigate}>
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
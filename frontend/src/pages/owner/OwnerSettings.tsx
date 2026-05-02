import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';

interface Props { onNavigate: (page: string) => void; }

const USERS = [
  { email: 'owner@baytelkhebra.com', role: 'Owner', status: 'ACTIVE' },
  { email: 'manager@baytelkhebra.com', role: 'Manager', status: 'ACTIVE' },
  { email: 'production@baytelkhebra.com', role: 'Production', status: 'ACTIVE' },
];

export default function OwnerSettings({ onNavigate }: Props) {
  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });

  return (
    <AppShell role="owner" activePage="owner-settings" onNavigate={onNavigate}>
      <Topbar title="Owner Settings" userName="Administration" />
      <section className="stack">
        <article className="box">
          <h3>Pricing Roles</h3>
          <div className="form-grid-2">
            <div className="field"><label>Pricing Owner</label><input className="input" type="text" value={pricing.owner} onChange={(e) => setPricing((p) => ({ ...p, owner: e.target.value }))} /></div>
            <div className="field"><label>Approval Threshold (EGP)</label><input className="input" type="number" value={pricing.threshold} onChange={(e) => setPricing((p) => ({ ...p, threshold: e.target.value }))} /></div>
          </div>
        </article>
        <article className="box">
          <h3>Notification Format (WhatsApp Integration)</h3>
          <div className="field"><label>WhatsApp Business Number</label><input className="input" type="text" value={whatsapp.number} onChange={(e) => setWhatsapp((w) => ({ ...w, number: e.target.value }))} /></div>
          <div className="field"><label>Message Template</label><textarea className="textarea" value={whatsapp.template} onChange={(e) => setWhatsapp((w) => ({ ...w, template: e.target.value }))} /></div>
        </article>
        <article className="box">
          <h3>User Management</h3>
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td><button className="btn">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </AppShell>
  );
}

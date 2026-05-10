import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';

interface User {
  email: string;
  role: string;
  status: string;
}

export default function OwnerSettings() {
  const { navigateTopLevel } = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const startEdit = (u: User) => { setEditEmail(u.email); setEditRole(u.role); setEditStatus(u.status); };
  const saveEdit = () => {
    setUsers((prev) => prev.map((u) => u.email === editEmail ? { ...u, role: editRole, status: editStatus } : u));
    setEditEmail(null);
    showToast('User updated.');
  };

  useEffect(() => {
    fetch('/public/data/users.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: User[]) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
        setError('Could not load user data. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title="Owner Settings" />
        <section className="stack">
          <div className="loading-state">Loading settings...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title="Owner Settings" />
        <section className="stack">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-settings">
      <Topbar title="Owner Settings" />
      <section className="stack">
        <article className="box">
          <h3>Pricing Roles</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Pricing Owner</label>
              <input
                className="input"
                type="text"
                value={pricing.owner}
                onChange={(e) => setPricing((p) => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Approval Threshold (EGP)</label>
              <input
                className="input"
                type="number"
                value={pricing.threshold}
                onChange={(e) => setPricing((p) => ({ ...p, threshold: e.target.value }))}
              />
            </div>
          </div>
        </article>
        <article className="box">
          <h3>Notification Format (WhatsApp Integration)</h3>
          <div className="field">
            <label>WhatsApp Business Number</label>
            <input
              className="input"
              type="text"
              value={whatsapp.number}
              onChange={(e) => setWhatsapp((w) => ({ ...w, number: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Message Template</label>
            <textarea
              className="textarea"
              value={whatsapp.template}
              onChange={(e) => setWhatsapp((w) => ({ ...w, template: e.target.value }))}
            />
          </div>
        </article>
        <article className="box">
          <h3>User Management</h3>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                editEmail === u.email ? (
                  <tr key={u.email}>
                    <td>{u.email}</td>
                    <td>
                      <select className="select" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        <option>Owner</option>
                        <option>Manager</option>
                        <option>Staff</option>
                      </select>
                    </td>
                    <td>
                      <select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn primary" onClick={saveEdit}>Save</button>
                      <button className="btn" onClick={() => setEditEmail(null)}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.email}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td><button className="btn" onClick={() => startEdit(u)}>Edit</button></td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </article>
      </section>
      {toast && <div className="success-toast">{toast}</div>}
    </AppShell>
  );
}
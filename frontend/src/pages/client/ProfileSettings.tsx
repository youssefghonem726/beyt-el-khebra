import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  since: string | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
  };
}

interface Props {
  /** Client ID (e.g., "CL-001") – defaults to CL-001 */
  clientId?: string;
}

export default function ProfileSettings({ clientId = 'CL-001' }: Props) {
  const { navigateTopLevel } = useNavigation();
  const [info, setInfo] = useState({ name: '', email: '', phone: '', address: '' });
  const [security, setSecurity] = useState({ current: '', newPass: '' });
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/json/clients.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Client[]) => {
        // Find the client by ID
        let currentUser = data.find((c) => c.id === clientId);
        // Fallback to first client if not found
        if (!currentUser && data.length > 0) {
          currentUser = data[0];
        }
        if (currentUser) {
          setInfo({
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            address: currentUser.address,
          });
        } else {
          setError('No client data available.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError('Could not load your profile. Please try again later.');
        setLoading(false);
      });
  }, [clientId]);

  const setField = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo((f) => ({ ...f, [k]: e.target.value }));
  const setSec = (k: keyof typeof security) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSecurity((f) => ({ ...f, [k]: e.target.value }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = () => showToast('Changes saved successfully.');

  const handleUpdatePassword = () => {
    if (!security.current) {
      showToast('Please enter your current password.');
      return;
    }
    if (!security.newPass) {
      showToast('Please enter a new password.');
      return;
    }
    if (security.newPass.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }
    setSecurity({ current: '', newPass: '' });
    showToast('Password updated successfully.');
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="profile-settings">
        <Topbar title="Profile Settings" />
        <div className="loading-state">Loading profile...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="profile-settings">
        <Topbar title="Profile Settings" />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="profile-settings">
      <Topbar title="Profile Settings" />
      <section className="split">
        <article className="box">
          <h3>Account Information</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Store Name</label>
              <input className="input" type="text" value={info.name} onChange={setField('name')} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={info.email} onChange={setField('email')} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" type="text" value={info.phone} onChange={setField('phone')} />
            </div>
            <div className="field">
              <label>Address</label>
              <input className="input" type="text" value={info.address} onChange={setField('address')} />
            </div>
          </div>
          <button className="btn primary" style={{ marginTop: 10 }} onClick={handleSave}>
            Save Changes
          </button>
        </article>
        <aside className="box">
          <h3>Security</h3>
          <div className="field">
            <label>Current Password</label>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={security.current}
              onChange={setSec('current')}
            />
          </div>
          <div className="field">
            <label>New Password</label>
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={security.newPass}
              onChange={setSec('newPass')}
            />
          </div>
          <button className="btn block" style={{ marginTop: 10 }} onClick={handleUpdatePassword}>
            Update Password
          </button>
        </aside>
      </section>
      {toast && <div className="success-toast">{toast}</div>}
    </AppShell>
  );
}
import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
// Direct service imports – bypasses VITE_USE_MOCK
import { getMe, updateMe } from '../../lib/api/usersService';

export default function ProfileSettings() {
  const { navigateTopLevel } = useNavigation();
  const [info, setInfo] = useState({ name: '', email: '', phone: '' });
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMe();
        const user = res.data.data;
        setInfo({
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
          email: user.email,
          phone: user.phone || '',
        });
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Could not load your profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const setField = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo((f) => ({ ...f, [k]: e.target.value }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Split name into first_name and last_name (last word is last name)
      const parts = info.name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      await updateMe({
        first_name: firstName,
        last_name: lastName,
        email: info.email,
        phone: info.phone,
      });
      showToast('Changes saved successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Could not save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
              <label>Full Name</label>
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
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 10 }}
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </article>

        <aside className="box">
          <h3>Security</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Password changes are managed by Supabase. Use the “Forgot password” link on the login page or contact support.
          </p>
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => window.open('https://your-supabase-project.supabase.co/auth/v1/recover', '_blank')}
          >
            Reset Password
          </button>
        </aside>
      </section>
      {toast && <div className="success-toast">{toast}</div>}
    </AppShell>
  );
}
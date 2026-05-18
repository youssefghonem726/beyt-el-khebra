import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { getMe, updateMe } from '../../lib/api/usersService';

export default function ProfileSettings() {
  return (
    <Suspense fallback={null}>
      <ProfileSettingsInner />
    </Suspense>
  );
}

function ProfileSettingsInner() {
  const { t } = useTranslation(['common', 'profileSettings']);
  const [info, setInfo] = useState({ name: '', email: '', phone: '' });
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(t('profileSettings:error'));
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
      const parts = info.name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      await updateMe({
        first_name: firstName,
        last_name: lastName,
        email: info.email,
        phone: info.phone,
      });
      showToast(t('profileSettings:saveSuccess'));
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(t('profileSettings:saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="client" activePage="profile-settings">
        <Topbar title={t('profileSettings:title')} />
        <div className="loading-state">{t('profileSettings:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="client" activePage="profile-settings">
        <Topbar title={t('profileSettings:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" activePage="profile-settings">
      <Topbar title={t('profileSettings:title')} />
      <section className="split">
        <article className="box">
          <h3>{t('profileSettings:account.title')}</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>{t('profileSettings:account.fullName')}</label>
              <input className="input" type="text" value={info.name} onChange={setField('name')} />
            </div>
            <div className="field">
              <label>{t('profileSettings:account.email')}</label>
              <input className="input" type="email" value={info.email} onChange={setField('email')} />
            </div>
            <div className="field">
              <label>{t('profileSettings:account.phone')}</label>
              <input className="input" type="text" value={info.phone} onChange={setField('phone')} />
            </div>
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 10 }}
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? t('profileSettings:account.saving') : t('profileSettings:account.save')}
          </button>
        </article>

        <aside className="box">
          <h3>{t('profileSettings:security.title')}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {t('profileSettings:security.description')}
          </p>
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => window.open('https://your-supabase-project.supabase.co/auth/v1/recover', '_blank')}
          >
            {t('profileSettings:security.resetPassword')}
          </button>
        </aside>
      </section>
      {toast && <div className="success-toast">{toast}</div>}
    </AppShell>
  );
}

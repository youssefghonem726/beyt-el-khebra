import { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AuthShell from '../../components/AuthShell';
import supabase from '../../lib/supabase';
import { useNavigation } from '../../context/NavigationContext';

export default function CreateAccount() {
  return (
    <Suspense fallback={null}>
      <CreateAccountInner />
    </Suspense>
  );
}

function CreateAccountInner() {
  const { t } = useTranslation(['common', 'auth']);
  const { navigateTopLevel } = useNavigation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: ''
  });

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSignup = async () => {
    // Reset error
    setError('');
    
    // Basic validation
    if (!form.email || !form.password) {
      setError(t('auth:signup.errors.required'));
      return;
    }

    if (form.password !== form.confirm) {
      setError(t('auth:signup.errors.mismatch'));
      return;
    }

    if (form.password.length < 6) {
      setError(t('auth:signup.errors.minLength'));
      return;
    }

    if (!agreed) {
      setError(t('auth:signup.errors.terms'));
      return;
    }

    setLoading(true);

    // Sign up with metadata including name
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          user_role: 'client' // Default role for new signups
        }
      }
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // After successful signup, redirect to login
    if (data?.user) {
      alert(t('auth:signup.successAlert'));
      navigateTopLevel('login');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <section className="auth-card">
        <h1 className="center">{t('auth:signup.title')}</h1>
        <p className="center muted">{t('auth:signup.subtitle')}</p>

        {error && (
          <p style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </p>
        )}

        <div className="field">
          <label>{t('auth:signup.fullName')}</label>
          <input
            className="input"
            type="text"
            placeholder={t('auth:signup.fullNamePlaceholder')}
            value={form.name}
            onChange={set('name')}
          />
        </div>

        <div className="field">
          <label>{t('auth:signup.email')}</label>
          <input
            className="input"
            type="email"
            placeholder={t('auth:signup.emailPlaceholder')}
            value={form.email}
            onChange={set('email')}
          />
        </div>

        <div className="field">
          <label>{t('auth:signup.password')}</label>
          <input
            className="input"
            type="password"
            placeholder={t('auth:signup.passwordPlaceholder')}
            value={form.password}
            onChange={set('password')}
          />
        </div>

        <div className="field">
          <label>{t('auth:signup.confirmPassword')}</label>
          <input
            className="input"
            type="password"
            placeholder={t('auth:signup.confirmPlaceholder')}
            value={form.confirm}
            onChange={set('confirm')}
          />
        </div>

        <label className="tiny">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />{' '}
          {t('auth:signup.terms')}
        </label>

        <button
          className="btn primary block center"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? t('auth:signup.creating') : t('auth:signup.submit')}
        </button>

        <p className="center muted tiny">{t('auth:signup.or')}</p>

        <button
          className="btn block center"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          {t('auth:signup.google')}
        </button>

        <p className="center tiny">
          {t('auth:signup.hasAccount')}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigateTopLevel('login');
            }}
          >
            <strong>{t('auth:signup.login')}</strong>
          </a>
        </p>

        {/* DEV ONLY — remove before production */}
        {import.meta.env.DEV && (
          <button
            className="btn block center"
            style={{ marginTop: '0.5rem', opacity: 0.6, fontSize: '0.75rem' }}
            onClick={() => navigateTopLevel('test')}
          >
            [DEV] Skip to Testing Landing
          </button>
        )}
      </section>
    </AuthShell>
  );
}
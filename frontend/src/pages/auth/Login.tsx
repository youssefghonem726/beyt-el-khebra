import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthShell from '../../components/AuthShell';
import supabase from '../../lib/supabase';
import { getRoleHomePage, getRoleFromAccessToken } from '../../App';

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { t } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    const accessToken = data.session?.access_token;
    const role = getRoleFromAccessToken(accessToken);
    navigate(getRoleHomePage(role));
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <AuthShell>
      <section className="auth-card">
        <h1 className="center">{t('auth:login.title')}</h1>
        <p className="center muted">{t('auth:login.subtitle')}</p>

        {error && (
          <p style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </p>
        )}

        <div className="field">
          <label>{t('auth:login.email')}</label>
          <input
            className="input"
            type="email"
            placeholder={t('auth:login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>{t('auth:login.password')}</label>
          <input
            className="input"
            type="password"
            placeholder={t('auth:login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="table-head">
          <label className="tiny">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />{' '}
            {t('auth:login.rememberMe')}
          </label>

          <a className="tiny" href="#" onClick={(e) => e.preventDefault()}>
            {t('auth:login.forgotPassword')}
          </a>
        </div>

        <button className="btn primary block center" onClick={handleLogin}>
          {t('auth:login.submit')}
        </button>

        <p className="center muted tiny">{t('auth:login.or')}</p>

        <button className="btn block center" onClick={handleGoogleLogin}>
          {t('auth:login.google')}
        </button>

        <p className="center tiny">
          {t('auth:login.noAccount')}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/create-account'); }}>
            <strong>{t('auth:login.createAccount')}</strong>
          </a>
        </p>

        {import.meta.env.DEV && (
          <button
            className="btn block center"
            style={{ marginTop: '0.5rem', opacity: 0.6, fontSize: '0.75rem' }}
            onClick={() => navigate('/test')}
          >
            [DEV] Skip to Testing Landing
          </button>
        )}
      </section>
    </AuthShell>
  );
}

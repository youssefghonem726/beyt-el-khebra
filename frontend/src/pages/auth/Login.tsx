import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import supabase from '../../lib/supabase';
import { getRoleHomePage } from '../../App';

export default function Login() {
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

    const role = data.user?.app_metadata?.user_role ?? 'client';
    navigate(getRoleHomePage(role));
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <AuthShell>
      <section className="auth-card">
        <h1 className="center">Welcome Back!</h1>
        <p className="center muted">Login to your account</p>

        {error && (
          <p style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </p>
        )}

        <div className="field">
          <label>Email Address</label>
          <input
            className="input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            placeholder="Enter your password"
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
            Remember me
          </label>

          <a className="tiny" href="#" onClick={(e) => { e.preventDefault(); }}>
            Forgot Password?
          </a>
        </div>

        <button className="btn primary block center" onClick={handleLogin}>
          Login Account
        </button>

        <p className="center muted tiny">or</p>

        <button className="btn block center" onClick={handleGoogleLogin}>
          Login with Google
        </button>

        <p className="center tiny">
          Don't have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/create-account'); }}>
            <strong>Create Account</strong>
          </a>
        </p>

        {/* DEV ONLY — remove before production */}
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
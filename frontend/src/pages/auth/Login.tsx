import { useState } from 'react';
import AuthShell from '../../components/AuthShell';
import { validateLogin } from '../../data/credentials';
import type { User } from '../../data/credentials';

interface Props {
  onNavigate: (page: string) => void;
  onLogin: (user: User) => void;
}

export default function Login({ onNavigate, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    const user = validateLogin(email, password);
    if (user) {
      setError('');
      onLogin(user);
      // Navigate based on role
      if (user.role === 'owner') onNavigate('owner-dashboard');
      else if (user.role === 'client') onNavigate('client-dashboard');
      else if (user.role === 'manager') onNavigate('active-jobs');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <AuthShell>
      <section className="auth-card">
        <h1 className="center">Welcome Back!</h1>
        <p className="center muted">Login to your account</p>

        {error && <p style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 15 }}>{error}</p>}

        <div className="field">
          <label>Email Address</label>
          <input className="input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="table-head">
          <label className="tiny">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <a className="tiny" href="#" onClick={(e) => { e.preventDefault(); onNavigate('support'); }}>Forgot Password?</a>
        </div>

        <button className="btn primary block center" onClick={handleLogin}>Login</button>
        <p className="center muted tiny">or</p>
        <button className="btn block center">Login with Google</button>
        <p className="center tiny">
          Don't have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('create-account'); }}><strong>Create Account</strong></a>
        </p>
      </section>
    </AuthShell>
  );
}

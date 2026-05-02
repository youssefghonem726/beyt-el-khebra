import { useState } from 'react';
import AuthShell from '../../components/AuthShell';

interface Props {
  onNavigate: (page: string) => void;
}

export default function CreateAccount({ onNavigate }: Props) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell>
      <section className="auth-card">
        <h1 className="center">Create Account</h1>
        <p className="center muted">Register to get started</p>

        <div className="field">
          <label>Full Name</label>
          <input className="input" type="text" placeholder="Enter your full name" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label>Email Address</label>
          <input className="input" type="email" placeholder="Enter your email" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" placeholder="Create a password" value={form.password} onChange={set('password')} />
        </div>
        <div className="field">
          <label>Confirm Password</label>
          <input className="input" type="password" placeholder="Confirm your password" value={form.confirm} onChange={set('confirm')} />
        </div>

        <label className="tiny">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />{' '}
          I agree to the Terms of Service and Privacy Policy
        </label>
        <button className="btn primary block center" onClick={() => onNavigate('owner-dashboard')}>Create Account</button>
        <p className="center muted tiny">or</p>
        <button className="btn block center">Sign up with Google</button>
        <p className="center tiny">
          Already have an account?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }}><strong>Login</strong></a>
        </p>
      </section>
    </AuthShell>
  );
}

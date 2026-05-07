import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import supabase from '../../lib/supabase';
import { getRoleHomePage } from '../../App';

interface Props {
  onNavigate?: (page: string) => void;
}

export default function CreateAccount({ onNavigate }: Props) {
  const navigate = useNavigate();
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
      setError('Email and password are required');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreed) {
      setError('You must agree to the terms');
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

    // After successful signup, redirect based on role
    if (data?.user) {
      const role = data.user.user_metadata?.user_role ?? 'client';
      
      // If using onNavigate prop (for non-router version)
      if (onNavigate) {
        alert('Account created successfully! Please login.');
        onNavigate('login');
      } else {
        // If using react-router
        alert('Account created successfully! Please login.');
        navigate('/login');
      }
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
        <h1 className="center">Create Account</h1>
        <p className="center muted">Register to get started</p>

        {error && (
          <p style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </p>
        )}

        <div className="field">
          <label>Full Name</label>
          <input
            className="input"
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={set('name')}
          />
        </div>

        <div className="field">
          <label>Email Address</label>
          <input
            className="input"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={set('email')}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            placeholder="Create a password (min. 6 characters)"
            value={form.password}
            onChange={set('password')}
          />
        </div>

        <div className="field">
          <label>Confirm Password</label>
          <input
            className="input"
            type="password"
            placeholder="Confirm your password"
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
          I agree to the Terms of Service and Privacy Policy
        </label>

        <button
          className="btn primary block center"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="center muted tiny">or</p>

        <button 
          className="btn block center" 
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          Sign up with Google
        </button>

        <p className="center tiny">
          Already have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('login');
              } else {
                navigate('/login');
              }
            }}
          >
            <strong>Login</strong>
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
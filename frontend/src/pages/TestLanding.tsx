import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { getRoleHomePage } from '../App';

export default function TestLanding() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setRole(data.user?.app_metadata?.user_role ?? null);
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Testing — Quick Navigation</h1>

      {role && (
        <button className="btn primary" style={{ minWidth: 220, background: '#4caf50' }} onClick={() => navigate(getRoleHomePage(role))}>
          → My Dashboard ({role})
        </button>
      )}

      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => navigate('/owner')}>Owner Dashboard</button>
      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => navigate('/client')}>Client Dashboard</button>
      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => navigate('/manager/jobs')}>Production Dashboard</button>
      <button className="btn" style={{ minWidth: 220 }} onClick={() => navigate('/login')}>Login</button>
      <button className="btn" style={{ minWidth: 220 }} onClick={() => navigate('/create-account')}>Create Account</button>
    </div>
  );
}
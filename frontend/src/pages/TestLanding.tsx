interface Props { onNavigate: (page: string) => void; }

export default function TestLanding({ onNavigate }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Testing — Quick Navigation</h1>
      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => onNavigate('owner-dashboard')}>Owner Dashboard</button>
      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => onNavigate('client-dashboard')}>Client Dashboard</button>
      <button className="btn primary" style={{ minWidth: 220 }} onClick={() => onNavigate('active-jobs')}>Production Dashboard</button>
      <button className="btn" style={{ minWidth: 220 }} onClick={() => onNavigate('login')}>Login</button>
      <button className="btn" style={{ minWidth: 220 }} onClick={() => onNavigate('create-account')}>Create Account</button>
    </div>
  );
}

import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';

interface Props { onNavigate: (page: string) => void; }

export default function ProfileSettings({ onNavigate }: Props) {
  const [info, setInfo] = useState({ name: 'Client Name', email: 'ahmed@store.com', phone: '+20 101 000 1021', address: 'Cairo, Egypt' });
  const [security, setSecurity] = useState({ current: '', newPass: '' });

  const setField = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement>) => setInfo((f) => ({ ...f, [k]: e.target.value }));
  const setSec = (k: keyof typeof security) => (e: React.ChangeEvent<HTMLInputElement>) => setSecurity((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell role="client" activePage="profile-settings" onNavigate={onNavigate}>
      <Topbar title="Profile Settings" userName="Client Name" />
      <section className="split">
        <article className="box">
          <h3>Account Information</h3>
          <div className="form-grid-2">
            <div className="field"><label>Store Name</label><input className="input" type="text" value={info.name} onChange={setField('name')} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={info.email} onChange={setField('email')} /></div>
            <div className="field"><label>Phone</label><input className="input" type="text" value={info.phone} onChange={setField('phone')} /></div>
            <div className="field"><label>Address</label><input className="input" type="text" value={info.address} onChange={setField('address')} /></div>
          </div>
          <button className="btn primary" style={{ marginTop: 10 }}>Save Changes</button>
        </article>
        <aside className="box">
          <h3>Security</h3>
          <div className="field"><label>Current Password</label><input className="input" type="password" placeholder="Current password" value={security.current} onChange={setSec('current')} /></div>
          <div className="field"><label>New Password</label><input className="input" type="password" placeholder="New password" value={security.newPass} onChange={setSec('newPass')} /></div>
          <button className="btn block" style={{ marginTop: 10 }}>Update Password</button>
        </aside>
      </section>
    </AppShell>
  );
}

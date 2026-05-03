import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function AuthShell({ children }: Props) {
  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <div>
          <h2 className="logo">Bayt El Khebra</h2>
          <div style={{ marginTop: 60 }}>
            <h3>Welcome to Bayt El Khebra</h3>
            <p className="muted">Manage your orders easily and track every step of the printing process.</p>
          </div>
        </div>
        <p className="tiny muted">© 2025 Bayt El Khebra. All rights reserved.</p>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}

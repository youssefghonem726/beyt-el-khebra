import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import type { Role } from '../data/navData';
import { useNavigation } from '../context/NavigationContext';

interface Props {
  role: Role;
  activePage: string;
  children: ReactNode;
}

export default function AppShell({ role, activePage, children }: Props) {
  const { goBack, canGoBack } = useNavigation();
  return (
    <div className="app-shell">
      <Sidebar role={role} activePage={activePage}  />
      <main className="main">
        {canGoBack && (
          <button className="global-back-btn" onClick={goBack}>
            ← Back
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
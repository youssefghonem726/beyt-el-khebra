import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import type { Role } from '../data/navData';

interface Props {
  role: Role;
  activePage: string;
  children: ReactNode;
}

export default function AppShell({ role, activePage, children }: Props) {
  return (
    <div className="app-shell">
      <Sidebar role={role} activePage={activePage} />
      <main className="main">
        {children}
      </main>
    </div>
  );
}
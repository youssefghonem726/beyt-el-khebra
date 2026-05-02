import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import type { Role } from '../data/navData';

interface Props {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export default function AppShell({ role, activePage, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <Sidebar role={role} activePage={activePage} onNavigate={onNavigate} />
      <main className="main">{children}</main>
    </div>
  );
}

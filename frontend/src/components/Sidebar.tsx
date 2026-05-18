import { NAVS } from '../data/navData';
import type { Role } from '../data/navData';
import { useNavigation } from '../context/NavigationContext';
import LanguageToggle from './LanguageToggle';

interface Props {
  role: Role;
  activePage: string;
}

const ROLE_LABEL: Record<Role, string> = {
  owner:   'Owner Dashboard',
  manager: 'Manager Dashboard',
  client:  'Client Dashboard',
};

export default function Sidebar({ role, activePage }: Props) {
  const { navigateTopLevel } = useNavigation();
  const links = NAVS[role];

  return (
    <aside className="sidebar">
      <h2 className="logo">
        <span className="logo-mark">Logo</span>
        <span className="logo-name">Bayt El Khebra</span>
        <span className="logo-sub">{ROLE_LABEL[role]}</span>
      </h2>
      <nav>
        {links.map((item) => (
          <a
            key={item.page}
            className={`nav-link${activePage === item.page ? ' active' : ''}`}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateTopLevel(item.page); }}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <LanguageToggle />
        <a className="logout-link" href="#" onClick={(e) => { e.preventDefault(); navigateTopLevel('login'); }}>
          Log Out
        </a>
      </div>
    </aside>
  );
}
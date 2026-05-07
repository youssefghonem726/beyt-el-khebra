import { NAVS } from '../data/navData';
import type { Role } from '../data/navData';
import { useNavigation } from '../context/NavigationContext';

interface Props {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ role, activePage }: Props) {
  const { navigateTopLevel } = useNavigation();
  const links = NAVS[role];

  return (
    <aside className="sidebar">
      <h2 className="logo">
        <span className="logo-mark">Logo</span>
        <span className="logo-name">Bayt El Khebra</span>
        <span className="logo-sub">Bayt El Khebra</span>
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
        <a className="logout-link" href="#" onClick={(e) => { e.preventDefault(); navigateTopLevel('login'); }}>
          Log Out
        </a>
      </div>
    </aside>
  );
}

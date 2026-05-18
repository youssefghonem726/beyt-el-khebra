import { useTranslation } from 'react-i18next';
import { NAVS } from '../data/navData';
import type { Role } from '../data/navData';
import { useNavigation } from '../context/NavigationContext';
import LanguageToggle from './LanguageToggle';

interface Props {
  role: Role;
  activePage: string;
}

const ROLE_BRAND_KEY: Record<Role, string> = {
  owner:   'ownerDashboard',
  manager: 'managerDashboard',
  client:  'clientDashboard',
};

export default function Sidebar({ role, activePage }: Props) {
  const { t } = useTranslation('common');
  const { navigateTopLevel } = useNavigation();
  const links = NAVS[role];

  return (
    <aside className="sidebar">
      <h2 className="logo">
        <span className="logo-mark">Logo</span>
        <span className="logo-name">{t('brand.name')}</span>
        <span className="logo-sub">{t(`brand.${ROLE_BRAND_KEY[role]}`)}</span>
      </h2>
      <nav>
        {links.map((item) => (
          <a
            key={item.page}
            className={`nav-link${activePage === item.page ? ' active' : ''}`}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateTopLevel(item.page); }}
          >
            {t(`nav.${item.labelKey}`)}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <LanguageToggle />
        <a className="logout-link" href="#" onClick={(e) => { e.preventDefault(); navigateTopLevel('login'); }}>
          {t('actions.logout')}
        </a>
      </div>
    </aside>
  );
}

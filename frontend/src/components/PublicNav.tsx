import { useNavigation } from '../context/NavigationContext';
import LanguageToggle from './LanguageToggle';

export default function PublicNav() {
  const { navigateTopLevel } = useNavigation();
  
  const link = (page: string, label: string, bold?: boolean) => (
    <a href="#" onClick={(e) => { e.preventDefault(); navigateTopLevel(page); }}>
      {bold ? <strong>{label}</strong> : label}
    </a>
  );

  return (
    <header className="public-nav">
      <h2 className="logo">Bayt El Khebra</h2>
      <nav className="public-nav-links">
        {link('owner-dashboard', 'Home')}
        {link('place-new-order', 'Place Order')}
        {link('track-order', 'Track Order', true)}
        {link('support', 'Services')}
        {link('support', 'Contact Us')}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <LanguageToggle />
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTopLevel('login'); }}>Login</a>
      </div>
    </header>
  );
}
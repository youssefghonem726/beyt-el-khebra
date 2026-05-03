interface Props {
  onNavigate: (page: string) => void;
}

export default function PublicNav({ onNavigate }: Props) {
  const link = (page: string, label: string, bold?: boolean) => (
    <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(page); }}>
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
      <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }}>Login</a>
    </header>
  );
}

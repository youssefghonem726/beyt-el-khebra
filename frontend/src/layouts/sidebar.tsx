import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-4 text-xl font-bold border-b border-gray-700">
        Beyt El Khebra
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 p-4 flex-1">
        <NavLink to="/" className="hover:text-blue-400">
          Dashboard
        </NavLink>
        <NavLink to="/accounting">Accounting</NavLink>
        <NavLink to="/clients">Clients</NavLink>
        <NavLink to="/production">Production</NavLink>
        <NavLink to="/queue">Unpriced</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer p-4 border-t border-gray-700 text-sm">
        Owner
      </div>
    </aside>
  );
};

export default Sidebar;
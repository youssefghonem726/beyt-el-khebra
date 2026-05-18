import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PAGE_TO_PATH } from '../data/navData';

interface NavigationContextType {
  goBack: () => void;
  canGoBack: boolean;
  navigateTopLevel: (target: string) => void;
}

export const NavigationContext = createContext<NavigationContextType>({
  goBack: () => {},
  canGoBack: false,
  navigateTopLevel: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = location.key !== 'default';

  const goBack = () => navigate(-1);

  const navigateTopLevel = (target: string) => {
    if (target.startsWith('/')) { navigate(target); return; }
    const path = PAGE_TO_PATH[target] ?? `/${target}`;
    navigate(path);
  };

  return (
    <NavigationContext.Provider value={{ goBack, canGoBack, navigateTopLevel }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);

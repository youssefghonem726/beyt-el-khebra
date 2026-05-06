import { createContext, useContext } from 'react';

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

export const useNavigation = () => useContext(NavigationContext);

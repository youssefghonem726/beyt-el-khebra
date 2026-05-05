import { createContext, useContext } from 'react';

interface NavigationContextType {
  goBack: () => void;
  canGoBack: boolean;
}

export const NavigationContext = createContext<NavigationContextType>({
  goBack: () => {},
  canGoBack: false,
});

export const useNavigation = () => useContext(NavigationContext);

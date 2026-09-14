import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationState } from '../types/navigation';
import { DemoDataProvider } from '../services/DemoDataProvider';

interface NavigationContextType {
  state: NavigationState;
  startNavigation: () => void;
  stopNavigation: () => void;
  setDemoState: (index: number) => void;
  cycleDemoState: () => void;
  resetPosition: () => void;
  dataProvider: DemoDataProvider;
}

const dataProviderInstance = new DemoDataProvider();

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navState, setNavState] = useState<NavigationState>(dataProviderInstance.getState());

  useEffect(() => {
    const unsubscribe = dataProviderInstance.subscribe((newState) => {
      setNavState(newState);
    });
    return unsubscribe;
  }, []);

  const value: NavigationContextType = {
    state: navState,
    startNavigation: () => dataProviderInstance.startNavigation(),
    stopNavigation: () => dataProviderInstance.stopNavigation(),
    setDemoState: (idx: number) => dataProviderInstance.setDemoState(idx),
    cycleDemoState: () => dataProviderInstance.cycleDemoState(),
    resetPosition: () => dataProviderInstance.resetPosition(),
    dataProvider: dataProviderInstance,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

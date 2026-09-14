import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationState, ActiveTab, Destination } from '../types/navigation';
import { NavigationService } from '../services/NavigationService';
import { RouteCalculationResult } from '../services/routing/RouteEngine';

interface NavigationContextType {
  state: NavigationState;
  startNavigation: () => Promise<void>;
  stopNavigation: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setDestination: (destination: Destination | null) => void;
  clearDestination: () => void;
  calculateRoute: () => Promise<RouteCalculationResult>;
  clearRoute: () => void;
  startTurnByTurnNavigation: () => void;
  endTurnByTurnNavigation: () => void;
  service: NavigationService;
}

const navigationServiceInstance = new NavigationService();

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navState, setNavState] = useState<NavigationState>(navigationServiceInstance.getState());

  useEffect(() => {
    const unsubscribe = navigationServiceInstance.subscribe((newState) => {
      setNavState(newState);
    });
    return unsubscribe;
  }, []);

  const value: NavigationContextType = {
    state: navState,
    startNavigation: () => navigationServiceInstance.startNavigation(),
    stopNavigation: () => navigationServiceInstance.stopNavigation(),
    setActiveTab: (tab: ActiveTab) => navigationServiceInstance.setActiveTab(tab),
    setDestination: (dest: Destination | null) => navigationServiceInstance.setDestination(dest),
    clearDestination: () => navigationServiceInstance.clearDestination(),
    calculateRoute: () => navigationServiceInstance.calculateRoute(),
    clearRoute: () => navigationServiceInstance.clearRoute(),
    startTurnByTurnNavigation: () => navigationServiceInstance.startTurnByTurnNavigation(),
    endTurnByTurnNavigation: () => navigationServiceInstance.endTurnByTurnNavigation(),
    service: navigationServiceInstance,
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

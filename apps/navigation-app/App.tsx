import React from 'react';
import { NavigationProvider } from './src/state/NavigationContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationProvider>
      <AppNavigator />
    </NavigationProvider>
  );
}

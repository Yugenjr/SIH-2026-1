import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { NavigationHeader } from '../components/NavigationHeader';
import { MainNavigationScreen } from '../screens/MainNavigationScreen';
import { SystemInfoScreen } from '../screens/SystemInfoScreen';
import { theme } from '../theme/theme';

export const AppNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'navigation' | 'system'>('navigation');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surfaceHeader} />
      <View style={styles.container}>
        <NavigationHeader activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'navigation' ? <MainNavigationScreen /> : <SystemInfoScreen />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHeader,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

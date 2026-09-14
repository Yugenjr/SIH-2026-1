import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '../state/NavigationContext';
import { DenialBanner } from '../components/DenialBanner';
import { MapViewPlaceholder } from '../components/MapViewPlaceholder';
import { StatusCard } from '../components/StatusCard';
import { ControlPanel } from '../components/ControlPanel';
import { theme } from '../theme/theme';

export const MainNavigationScreen: React.FC = () => {
  const { state } = useNavigation();

  return (
    <View style={styles.container}>
      <DenialBanner status={state.gnssStatus} message={state.activeBannerMessage} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Area */}
        <MapViewPlaceholder
          pose={state.pose}
          gnssPoints={state.gnssTrajectory}
          idrPoints={state.idrTrajectory}
          mapMatchedPoints={state.mapMatchedTrajectory}
          gnssDenied={state.gnssStatus === 'DENIED'}
        />

        {/* Status Dashboard */}
        <StatusCard navState={state} />

        {/* Action Control Panel */}
        <ControlPanel />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
});

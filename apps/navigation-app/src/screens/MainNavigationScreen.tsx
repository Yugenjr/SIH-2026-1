import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '../state/NavigationContext';
import { useAppTheme } from '../theme/ThemeContext';
import { TopBar } from '../components/TopBar';
import { OutageBanner } from '../components/OutageBanner';
import { MapViewPlaceholder } from '../components/MapViewPlaceholder';
import { TelemetryPanel } from '../components/TelemetryPanel';

export const MainNavigationScreen: React.FC = () => {
  const { state } = useNavigation();
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Compact Header Bar */}
      <TopBar status={state.gnssStatus} />

      {/* GNSS Outage / Recovery Mode Banner */}
      <OutageBanner
        status={state.gnssStatus}
        outageSeconds={state.outageDurationSeconds}
        confidence={state.confidence}
        speed={state.pose.speed}
        heading={state.pose.heading}
      />

      {/* Map-Centric Area (75-85% Screen Height) */}
      <View style={styles.mapWrapper}>
        <MapViewPlaceholder
          pose={state.pose}
          gnssPoints={state.gnssTrajectory}
          idrPoints={state.idrTrajectory}
          gnssStatus={state.gnssStatus}
          lastKnownPose={state.lastKnownGnssPose}
          confidence={state.confidence}
        />
      </View>

      {/* Compact Navigation Telemetry Bottom Panel */}
      <TelemetryPanel navState={state} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
});

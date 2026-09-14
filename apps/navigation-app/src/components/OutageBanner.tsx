import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { GnssStatus } from '../types/navigation';

interface OutageBannerProps {
  status: GnssStatus;
  outageSeconds?: number;
  confidence?: number;
  speed?: number | null;
  heading?: number | null;
}

export const OutageBanner: React.FC<OutageBannerProps> = ({ status }) => {
  const { theme } = useAppTheme();
  if (status === 'AVAILABLE') return null;

  const getBannerConfig = () => {
    switch (status) {
      case 'WAITING':
        return {
          title: 'WAITING FOR LOCATION',
          sub: 'Searching for GPS satellite signals...',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.08)',
          borderColor: 'rgba(59, 130, 246, 0.35)',
        };
      case 'PERMISSION_REQUIRED':
        return {
          title: 'LOCATION PERMISSION REQUIRED',
          sub: 'Enable location permission in settings to navigate',
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
        };
      case 'SIGNAL_LOST':
        return {
          title: 'GNSS SIGNAL LOST',
          sub: 'Location fix lost • Map frozen at last known position',
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.35)',
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: config.bgColor, borderBottomColor: config.borderColor },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: config.color }]} />
          <Text style={[styles.mainText, { color: config.color }]}>{config.title}</Text>
        </View>
        <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>{config.sub}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 15,
  },
  leftCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  mainText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});

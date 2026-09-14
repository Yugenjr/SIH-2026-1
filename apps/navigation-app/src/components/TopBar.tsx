import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Logo } from './Logo';
import { useAppTheme } from '../theme/ThemeContext';
import { GnssStatus } from '../types/navigation';
import { useNavigation } from '../state/NavigationContext';

interface TopBarProps {
  status: GnssStatus;
}

export const TopBar: React.FC<TopBarProps> = ({ status }) => {
  const { triggerGnssOutage } = useNavigation();
  const { theme } = useAppTheme();

  const getBadgeConfig = () => {
    switch (status) {
      case 'DENIED':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
          dot: theme.colors.gnssDenied,
          text: '#EF4444',
          label: 'DR ACTIVE',
        };
      case 'RECOVERING':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
          dot: theme.colors.gnssRecovering,
          text: theme.colors.gnssRecovering,
          label: 'REACQUIRING',
        };
      case 'AVAILABLE':
      default:
        return {
          bg: 'rgba(16, 185, 129, 0.10)',
          border: 'rgba(16, 185, 129, 0.30)',
          dot: theme.colors.gnssHealthy,
          text: theme.colors.gnssHealthy,
          label: 'GNSS AVAILABLE',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceHeader, borderBottomColor: theme.colors.cardBorder }]}>
      {/* Brand Lockup */}
      <View style={styles.brandRow}>
        <Logo size={24} showText={true} />
      </View>

      {/* Compact Status Pill */}
      <TouchableOpacity
        style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}
        onPress={triggerGnssOutage}
        activeOpacity={0.75}
      >
        <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
        <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

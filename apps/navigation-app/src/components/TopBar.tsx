import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Logo } from './Logo';
import { useAppTheme } from '../theme/ThemeContext';
import { GnssStatus } from '../types/navigation';

interface TopBarProps {
  status: GnssStatus;
}

export const TopBar: React.FC<TopBarProps> = ({ status }) => {
  const { theme } = useAppTheme();

  const getBadgeConfig = () => {
    switch (status) {
      case 'WAITING':
        return {
          bg: 'rgba(59, 130, 246, 0.12)',
          border: 'rgba(59, 130, 246, 0.35)',
          dot: '#3B82F6',
          text: '#3B82F6',
          label: 'SEARCHING GPS',
        };
      case 'PERMISSION_REQUIRED':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
          dot: '#F59E0B',
          text: '#F59E0B',
          label: 'PERM REQUIRED',
        };
      case 'SIGNAL_LOST':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
          dot: '#EF4444',
          text: '#EF4444',
          label: 'SIGNAL LOST',
        };
      case 'AVAILABLE':
      default:
        return {
          bg: 'rgba(16, 185, 129, 0.10)',
          border: 'rgba(16, 185, 129, 0.30)',
          dot: theme.colors.gnssHealthy,
          text: theme.colors.gnssHealthy,
          label: 'GNSS ACTIVE',
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
      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
        <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
        <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
      </View>
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

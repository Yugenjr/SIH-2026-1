import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { GnssStatus } from '../types/navigation';

interface OutageBannerProps {
  status: GnssStatus;
  outageSeconds: number;
  confidence: number;
  speed: number;
  heading: number;
}

export const OutageBanner: React.FC<OutageBannerProps> = ({ status, outageSeconds }) => {
  const { theme } = useAppTheme();
  if (status === 'AVAILABLE') return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRecovering = status === 'RECOVERING';

  return (
    <View
      style={[
        styles.banner,
        isRecovering ? styles.recoveringBg : styles.outageBg,
        { borderBottomColor: isRecovering ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)' },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, isRecovering ? styles.amberDot : styles.redDot]} />
          <Text style={[styles.mainText, isRecovering ? styles.amberText : styles.redText]}>
            {isRecovering ? 'GNSS REACQUIRED' : 'DEAD RECKONING ACTIVE'}
          </Text>
        </View>
        <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
          {isRecovering ? 'Synchronizing state matrix...' : 'GNSS unavailable • AI + IMU'}
        </Text>
      </View>

      {!isRecovering && (
        <View style={[styles.timerBadge, { backgroundColor: theme.colors.card, borderColor: 'rgba(239, 68, 68, 0.35)' }]}>
          <Text style={[styles.timerLabel, { color: theme.colors.textMuted }]}>OUTAGE </Text>
          <Text style={styles.timerValue}>{formatTimer(outageSeconds)}</Text>
        </View>
      )}
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
  outageBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  recoveringBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
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
  redDot: {
    backgroundColor: '#EF4444',
  },
  amberDot: {
    backgroundColor: '#F59E0B',
  },
  mainText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  redText: {
    color: '#EF4444',
  },
  amberText: {
    color: '#F59E0B',
  },
  subText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
});

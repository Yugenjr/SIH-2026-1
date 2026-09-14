import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { NavigationState } from '../types/navigation';
import { useNavigation } from '../state/NavigationContext';

interface TelemetryPanelProps {
  navState: NavigationState;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ navState }) => {
  const { startNavigation, stopNavigation, triggerGnssOutage } = useNavigation();
  const { theme } = useAppTheme();

  const isNavigating = navState.isNavigating;
  const isDenied = navState.gnssStatus === 'DENIED';
  const isRecovering = navState.gnssStatus === 'RECOVERING';

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.cardBorder }]}>
      {/* Compact Telemetry Strip */}
      <View style={[styles.strip, { backgroundColor: theme.colors.surfaceHeader, borderColor: theme.colors.cardBorder }]}>
        {/* SPEED */}
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>SPEED</Text>
          <View style={styles.numRow}>
            <Text style={[styles.numValue, { color: theme.colors.textPrimary }]}>{navState.pose.speed}</Text>
            <Text style={[styles.numUnit, { color: theme.colors.textSecondary }]}>km/h</Text>
          </View>
        </View>

        <View style={[styles.vertDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* HEADING */}
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>HEADING</Text>
          <View style={styles.numRow}>
            <Text style={[styles.numValue, { color: theme.colors.textPrimary }]}>{navState.pose.heading}°</Text>
            <Text style={[styles.numUnit, { color: theme.colors.textSecondary }]}>SE</Text>
          </View>
        </View>

        <View style={[styles.vertDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* CONFIDENCE */}
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>CONFIDENCE</Text>
          <View style={styles.numRow}>
            <Text style={[styles.numValue, { color: theme.colors.textPrimary }]}>{navState.confidence}%</Text>
            <Text style={[styles.numUnit, isDenied ? styles.unitRed : { color: theme.colors.textSecondary }]}>
              {isDenied ? 'DR' : 'GNSS'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Button Row */}
      <View style={styles.actionRow}>
        {!isNavigating ? (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: theme.colors.primary }]}
            onPress={startNavigation}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>START NAVIGATION</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeBtnGroup}>
            <TouchableOpacity
              style={[
                styles.simBtn,
                isDenied && styles.simBtnRecover,
                isRecovering && styles.simBtnSync,
              ]}
              onPress={triggerGnssOutage}
              activeOpacity={0.8}
            >
              <Text style={styles.simBtnText}>
                {isDenied
                  ? 'RECOVER GNSS'
                  : isRecovering
                  ? 'SYNCHRONIZING...'
                  : 'SIMULATE GNSS OUTAGE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endBtn, { backgroundColor: theme.colors.secondaryButton, borderColor: theme.colors.cardBorder }]}
              onPress={stopNavigation}
              activeOpacity={0.8}
            >
              <Text style={styles.endBtnText}>END</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  vertDivider: {
    width: 1,
    height: 22,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  numValue: {
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  numUnit: {
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 3,
  },
  unitRed: {
    color: '#EF4444',
  },
  actionRow: {
    flexDirection: 'row',
  },
  startBtn: {
    flex: 1,
    height: 42,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  activeBtnGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  simBtn: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  simBtnRecover: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  simBtnSync: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  endBtn: {
    width: 64,
    height: 42,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
});

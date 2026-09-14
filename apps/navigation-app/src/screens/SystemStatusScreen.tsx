import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { useNavigation } from '../state/NavigationContext';

export const SystemStatusScreen: React.FC = () => {
  const { state } = useNavigation();
  const { theme } = useAppTheme();

  const isGnssAvailable = state.gnssStatus === 'AVAILABLE';
  const hasFix = state.currentFix !== null && isGnssAvailable;

  const latDisplay = hasFix ? `${state.pose.latitude.toFixed(6)}° N` : 'WAITING FOR FIX';
  const lngDisplay = hasFix ? `${state.pose.longitude.toFixed(6)}° E` : 'WAITING FOR FIX';
  const accuracyDisplay =
    state.positionUncertainty !== null ? `${state.positionUncertainty.toFixed(1)} m` : '--';
  const speedDisplay =
    state.pose.speed !== null && state.pose.speed >= 0 ? `${state.pose.speed.toFixed(1)} km/h` : '--';
  const courseDisplay =
    state.pose.heading !== null && state.pose.heading >= 0 ? `${state.pose.heading}°` : '--';
  const updateRateDisplay = `${state.updateRateHz.toFixed(1)} Hz`;

  const statusLabel =
    state.gnssStatus === 'AVAILABLE'
      ? 'CONNECTED'
      : state.gnssStatus === 'PERMISSION_REQUIRED'
      ? 'PERMISSION DENIED'
      : state.gnssStatus === 'SIGNAL_LOST'
      ? 'SIGNAL LOST'
      : 'WAITING FOR FIX';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>ENGINEERING TELEMETRY</Text>
        <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>System Status</Text>
      </View>

      {/* REAL GNSS LOCATION TELEMETRY SECTION */}
      <View style={[styles.sectionGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>REAL PHONE LOCATION (GNSS)</Text>
        <View style={[styles.ruleDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* STATUS */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Status</Text>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, isGnssAvailable ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.statusText, isGnssAvailable ? styles.textGreen : styles.textAmber]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* LATITUDE */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Latitude</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{latDisplay}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* LONGITUDE */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Longitude</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{lngDisplay}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* ACCURACY */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Accuracy</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{accuracyDisplay}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* SPEED */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Speed</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{speedDisplay}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* COURSE */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Course</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{courseDisplay}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        {/* UPDATE RATE */}
        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Update Rate</Text>
          <Text style={[styles.valText, { color: theme.colors.textPrimary }]}>{updateRateDisplay}</Text>
        </View>
      </View>

      {/* SENSORS SECTION */}
      <View style={[styles.sectionGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>HARDWARE SUBSYSTEMS</Text>
        <View style={[styles.ruleDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>GNSS Receiver</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>Android Location Provider</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, isGnssAvailable ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.statusText, isGnssAvailable ? styles.textGreen : styles.textAmber]}>
              {isGnssAvailable ? 'Active' : 'Standby'}
            </Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Map Engine</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>MapLibre GL Native</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={[styles.statusText, styles.textGreen]}>Ready</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  titleSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionGroup: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  ruleDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowDivider: {
    height: 1,
    marginVertical: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  valText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textGreen: {
    color: '#10B981',
  },
  textAmber: {
    color: '#F59E0B',
  },
});

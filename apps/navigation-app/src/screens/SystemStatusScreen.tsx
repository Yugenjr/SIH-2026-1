import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { useNavigation } from '../state/NavigationContext';

export const SystemStatusScreen: React.FC = () => {
  const { state } = useNavigation();
  const { theme } = useAppTheme();

  const isImuConnected = state.imuStatus === 'CONNECTED';
  const isGnssAvailable = state.gnssStatus === 'AVAILABLE';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>ENGINEERING TELEMETRY</Text>
        <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>System Status</Text>
      </View>

      {/* SENSORS SECTION */}
      <View style={[styles.sectionGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>SENSORS</Text>
        <View style={[styles.ruleDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>IMU</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>200 Hz</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, isImuConnected ? styles.dotGreen : styles.dotRed]} />
            <Text style={[styles.statusText, isImuConnected ? styles.textGreen : styles.textRed]}>
              {isImuConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Accelerometer</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>MEMS 3-Axis</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={[styles.statusText, styles.textGreen]}>Connected</Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Gyroscope</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>MEMS 3-Axis</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={[styles.statusText, styles.textGreen]}>Connected</Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>GNSS</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>Dual L1/L5</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, isGnssAvailable ? styles.dotGreen : styles.dotRed]} />
            <Text style={[styles.statusText, isGnssAvailable ? styles.textGreen : styles.textRed]}>
              {isGnssAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>

      {/* PROCESSING SECTION */}
      <View style={[styles.sectionGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>PROCESSING</Text>
        <View style={[styles.ruleDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>SpeedNet</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>CNN + BiLSTM Neural Model</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>Ready</Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>7-State EKF</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>Position, Speed & Bias Filter</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>Ready</Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>NHC + ZUPT</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>Kinematic Motion Constraints</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>Engaged</Text>
          </View>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <View>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Processing</Text>
            <Text style={[styles.itemSub, { color: theme.colors.textMuted }]}>Average Execution Latency</Text>
          </View>
          <Text style={[styles.latencyText, { color: theme.colors.textPrimary }]}>{state.processingLatencyMs} ms</Text>
        </View>
      </View>

      {/* BENCHMARK SECTION */}
      <View style={[styles.sectionGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.benchmarkTitleRow}>
          <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>BENCHMARK</Text>
          <Text style={[styles.benchmarkOutageTag, { color: theme.colors.primary }]}>IO-VNBD • 300 s outage</Text>
        </View>
        <View style={[styles.ruleDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>M028 Baseline</Text>
          <Text style={styles.bmValueRed}>218.93 m</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>M029 Candidate</Text>
          <Text style={styles.bmValueGreen}>48.20 m</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.colors.cardBorder }]} />

        <View style={styles.rowItem}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Drift reduction</Text>
          <Text style={[styles.bmValuePrimary, { color: theme.colors.primary }]}>77.98%</Text>
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
    marginBottom: 10,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotRed: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: {
    color: '#10B981',
  },
  textRed: {
    color: '#EF4444',
  },
  latencyText: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rowDivider: {
    height: 1,
    marginVertical: 6,
  },
  benchmarkTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  benchmarkOutageTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bmValueRed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  bmValueGreen: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  bmValuePrimary: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});

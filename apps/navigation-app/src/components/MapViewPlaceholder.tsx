import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VehiclePose, TrajectoryPoint, GnssStatus } from '../types/navigation';
import { useAppTheme } from '../theme/ThemeContext';

interface MapViewProps {
  pose: VehiclePose;
  gnssPoints: TrajectoryPoint[];
  idrPoints: TrajectoryPoint[];
  gnssStatus: GnssStatus;
  lastKnownPose: VehiclePose | null;
  confidence?: number;
}

export const MapViewPlaceholder: React.FC<MapViewProps> = ({
  pose,
  gnssPoints,
  idrPoints,
  gnssStatus,
  lastKnownPose,
}) => {
  const { theme } = useAppTheme();
  const [zoomLevel, setZoomLevel] = useState(1);
  const isDenied = gnssStatus === 'DENIED';

  // Coordinate projection scaling
  const mapWidth = 360;
  const mapHeight = 440;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;
  const scale = 4.8 * zoomLevel;

  // Render trajectory path nodes
  const renderPathTrail = (points: TrajectoryPoint[], color: string, isDashed: boolean = false) => {
    if (points.length < 2) return null;
    const recent = points.slice(-35);

    return recent.map((pt, idx) => {
      const dx = (pt.x - pose.x) * scale;
      const dy = (pt.y - pose.y) * scale;
      const px = centerX + dx;
      const py = centerY - dy;

      if (px < -20 || px > mapWidth + 20 || py < -20 || py > mapHeight + 20) return null;

      const nodeSize = 4 + (idx / 35) * 3;
      const opacity = 0.35 + (idx / 35) * 0.65;

      return (
        <View
          key={`path-${pt.type}-${idx}`}
          style={[
            styles.pathDot,
            {
              left: px - nodeSize / 2,
              top: py - nodeSize / 2,
              width: nodeSize,
              height: nodeSize,
              borderRadius: nodeSize / 2,
              backgroundColor: color,
              opacity: isDashed && idx % 2 === 0 ? 0.3 : opacity,
            },
          ]}
        />
      );
    });
  };

  // Last known GNSS fix anchor marker
  const renderLastKnownAnchor = () => {
    if (!lastKnownPose || !isDenied) return null;
    const dx = (lastKnownPose.x - pose.x) * scale;
    const dy = (lastKnownPose.y - pose.y) * scale;
    const px = centerX + dx;
    const py = centerY - dy;

    if (px < -20 || px > mapWidth + 20 || py < -20 || py > mapHeight + 20) return null;

    return (
      <View key="last-gnss-anchor" style={[styles.anchorContainer, { left: px - 12, top: py - 12 }]}>
        <View style={[styles.anchorPulse, { borderColor: theme.colors.lastKnownGnssPoint }]} />
        <View style={[styles.anchorDot, { backgroundColor: theme.colors.lastKnownGnssPoint }]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapCanvas,
          {
            backgroundColor: theme.colors.mapBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {/* Subtle Grid Overlay */}
        <View style={styles.gridContainer}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={`grid-h-${i}`} style={[styles.gridHLine, { top: i * 50, backgroundColor: theme.colors.mapGrid }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`grid-v-${i}`} style={[styles.gridVLine, { left: i * 50, backgroundColor: theme.colors.mapGrid }]} />
          ))}
        </View>

        {/* Clean Road Network Lines */}
        <View style={styles.roadNetwork}>
          <View style={[styles.mainCorridor, { backgroundColor: theme.colors.roadMajor }]} />
          <View style={[styles.crossAvenue, { backgroundColor: theme.colors.roadMinor }]} />
        </View>

        {/* Trajectory Paths */}
        {renderPathTrail(gnssPoints, theme.colors.gnssPath, false)}
        {isDenied && renderPathTrail(idrPoints, theme.colors.idrPath, true)}

        {/* Last Known Fix Point */}
        {renderLastKnownAnchor()}

        {/* Heading-Oriented Vehicle Marker */}
        <View style={[styles.vehicleContainer, { left: centerX - 20, top: centerY - 20 }]}>
          <View
            style={[
              styles.accuracyRing,
              {
                borderColor: isDenied ? theme.colors.idrPath : theme.colors.vehicleMarker,
                backgroundColor: isDenied
                  ? theme.colors.accuracyDrCircle
                  : theme.colors.accuracyCircle,
              },
            ]}
          />

          <View
            style={[
              styles.vehicleArrowBox,
              { transform: [{ rotate: `${pose.heading}deg` }] },
            ]}
          >
            <View
              style={[
                styles.arrowDelta,
                { borderBottomColor: isDenied ? theme.colors.idrPath : theme.colors.vehicleMarker },
              ]}
            />
          </View>
        </View>

        {/* Small Professional Compass (Top-Right) */}
        <View style={[styles.compactCompass, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.compassN, { color: theme.colors.primary }]}>N</Text>
          <View
            style={[
              styles.compassNeedle,
              { transform: [{ rotate: `${-pose.heading}deg` }] },
            ]}
          >
            <View style={styles.needleN} />
            <View style={[styles.needleS, { borderTopColor: theme.colors.textMuted }]} />
          </View>
        </View>

        {/* Minimal Floating Map Controls (Bottom-Right) */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => setZoomLevel((z) => Math.min(z + 0.3, 2.0))}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlIcon, { color: theme.colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlIcon, { color: theme.colors.textPrimary }]}>−</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mapCanvas: {
    flex: 1,
    minHeight: 360,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  roadNetwork: {
    ...StyleSheet.absoluteFillObject,
  },
  mainCorridor: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: '46%',
    width: 24,
    transform: [{ rotate: '20deg' }],
  },
  crossAvenue: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: '50%',
    height: 16,
    transform: [{ rotate: '-10deg' }],
  },
  pathDot: {
    position: 'absolute',
  },
  anchorContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  anchorPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  anchorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vehicleContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 12,
  },
  accuracyRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  vehicleArrowBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDelta: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  compactCompass: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  compassN: {
    position: 'absolute',
    top: 1,
    fontSize: 7,
    fontWeight: '900',
  },
  compassNeedle: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  needleN: {
    width: 0,
    height: 0,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EF4444',
  },
  needleS: {
    width: 0,
    height: 0,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  floatingControls: {
    position: 'absolute',
    bottom: 12,
    right: 10,
    zIndex: 15,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  controlIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
});

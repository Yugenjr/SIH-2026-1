import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VehiclePose, TrajectoryPoint } from '../types/navigation';
import { theme } from '../theme/theme';

interface MapViewProps {
  pose: VehiclePose;
  gnssPoints: TrajectoryPoint[];
  idrPoints: TrajectoryPoint[];
  mapMatchedPoints: TrajectoryPoint[];
  gnssDenied: boolean;
}

export const MapViewPlaceholder: React.FC<MapViewProps> = ({
  pose,
  gnssPoints,
  idrPoints,
  mapMatchedPoints,
  gnssDenied,
}) => {
  const [showGnssLayer, setShowGnssLayer] = useState(true);
  const [showIdrLayer, setShowIdrLayer] = useState(true);

  // Map coordinate transformation mock
  const mapWidth = 340;
  const mapHeight = 300;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;

  // Render trajectory points as small path nodes
  const renderPathNodes = (points: TrajectoryPoint[], color: string) => {
    if (points.length < 2) return null;
    return points.slice(-30).map((pt, idx) => {
      // Map offset relative to pose
      const dx = (pt.x - pose.x) * 4;
      const dy = (pt.y - pose.y) * 4;
      const px = centerX + dx;
      const py = centerY - dy;

      if (px < 0 || px > mapWidth || py < 0 || py > mapHeight) return null;

      return (
        <View
          key={`node-${idx}`}
          style={[
            styles.pathNode,
            {
              left: px - 3,
              top: py - 3,
              backgroundColor: color,
              opacity: 0.3 + (idx / 30) * 0.7,
            },
          ]}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Background vector map canvas */}
      <View style={styles.mapCanvas}>
        {/* Vector Grid lines */}
        <View style={styles.gridContainer}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={`grid-h-${i}`} style={[styles.gridHLine, { top: i * 45 }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`grid-v-${i}`} style={[styles.gridVLine, { left: i * 45 }]} />
          ))}
        </View>

        {/* Major arterial roads vector layout */}
        <View style={styles.roadNetwork}>
          <View style={styles.mainHighway} />
          <View style={styles.crossRoad} />
          <View style={styles.ringRoad} />
        </View>

        {/* Trajectory layers */}
        {showGnssLayer && renderPathNodes(gnssPoints, theme.colors.gnssPath)}
        {showIdrLayer && renderPathNodes(idrPoints, theme.colors.idrPath)}

        {/* Vehicle Marker at center */}
        <View style={[styles.vehicleContainer, { left: centerX - 18, top: centerY - 18 }]}>
          <View style={styles.pulseRing} />
          <View
            style={[
              styles.vehicleIcon,
              { transform: [{ rotate: `${pose.heading}deg` }] },
            ]}
          >
            <View style={styles.vehicleArrow} />
          </View>
          <View style={styles.poseLabelContainer}>
            <Text style={styles.poseLabelText}>
              {pose.speed} km/h • {Math.round(pose.heading)}°
            </Text>
          </View>
        </View>

        {/* Offline Vector Map Overlay Tag */}
        <View style={styles.mapOverlayTag}>
          <View style={styles.mapStatusDot} />
          <Text style={styles.mapOverlayText}>OFFLINE VECTOR ENGINE</Text>
        </View>

        {/* Layer Controls */}
        <View style={styles.layerControlBox}>
          <TouchableOpacity
            style={[styles.layerChip, showGnssLayer && styles.layerChipActive]}
            onPress={() => setShowGnssLayer(!showGnssLayer)}
          >
            <View
              style={[
                styles.chipDot,
                { backgroundColor: gnssDenied ? theme.colors.gnssDenied : theme.colors.gnssPath },
              ]}
            />
            <Text style={styles.chipText}>GNSS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerChip, showIdrLayer && styles.layerChipActive]}
            onPress={() => setShowIdrLayer(!showIdrLayer)}
          >
            <View style={[styles.chipDot, { backgroundColor: theme.colors.idrPath }]} />
            <Text style={styles.chipText}>IDR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  mapCanvas: {
    flex: 1,
    minHeight: 280,
    backgroundColor: theme.colors.mapBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.mapGrid,
  },
  gridVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.mapGrid,
  },
  roadNetwork: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mainHighway: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: '45%',
    width: 24,
    backgroundColor: theme.colors.roadMajor,
    transform: [{ rotate: '25deg' }],
  },
  crossRoad: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: '55%',
    height: 18,
    backgroundColor: theme.colors.roadMinor,
    transform: [{ rotate: '-15deg' }],
  },
  ringRoad: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 14,
    borderColor: 'rgba(30, 44, 74, 0.4)',
    top: 30,
    left: 50,
  },
  pathNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vehicleContainer: {
    position: 'absolute',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.vehiclePulse,
  },
  vehicleIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.accent,
  },
  poseLabelContainer: {
    position: 'absolute',
    top: 40,
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poseLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mapOverlayTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  mapStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
    marginRight: 6,
  },
  mapOverlayText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  layerControlBox: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
    opacity: 0.6,
  },
  layerChipActive: {
    opacity: 1,
    borderColor: theme.colors.accent,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});

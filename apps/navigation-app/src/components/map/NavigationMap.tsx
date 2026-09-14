import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { VehiclePose, TrajectoryPoint, GnssStatus } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import { MAP_STYLES } from './mapConfig';
import { VehicleMarker } from './VehicleMarker';
import { MapControls } from './MapControls';

// Conditionally import MapLibre for native platform safety
let MapLibre: any = null;
try {
  MapLibre = require('@maplibre/maplibre-react-native');
  if (MapLibre && MapLibre.setAccessToken) {
    MapLibre.setAccessToken(null); // MapLibre vector tiles use open styles
  }
} catch (e) {
  MapLibre = null;
}

interface NavigationMapProps {
  pose: VehiclePose;
  gnssPoints: TrajectoryPoint[];
  idrPoints: TrajectoryPoint[];
  gnssStatus: GnssStatus;
  lastKnownPose: VehiclePose | null;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  pose,
  gnssPoints,
  idrPoints,
  gnssStatus,
}) => {
  const { isDark, theme } = useAppTheme();
  const [zoomLevel, setZoomLevel] = useState(15.5);
  const cameraRef = useRef<any>(null);
  const isDenied = gnssStatus === 'DENIED';

  const styleUrl = isDark ? MAP_STYLES.DARK : MAP_STYLES.LIGHT;

  const MapComponent = MapLibre ? (MapLibre.Map || MapLibre.MapView) : null;
  const CameraComponent = MapLibre ? MapLibre.Camera : null;
  const SourceComponent = MapLibre ? (MapLibre.GeoJSONSource || MapLibre.ShapeSource) : null;
  const LineLayerComponent = MapLibre ? MapLibre.LineLayer : null;
  const MarkerComponent = MapLibre ? (MapLibre.Marker || MapLibre.PointAnnotation) : null;

  const isNativeMapSupported = Platform.OS !== 'web' && MapComponent != null;

  // Transform GNSS trajectory points into GeoJSON LineString feature
  const gnssGeoJson = useMemo(() => {
    if (!gnssPoints || gnssPoints.length < 2) return null;
    const coordinates = gnssPoints.map((pt) => [pt.longitude, pt.latitude]);
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        },
      ],
    };
  }, [gnssPoints]);

  // Transform IDR trajectory points into GeoJSON LineString feature
  const idrGeoJson = useMemo(() => {
    if (!idrPoints || idrPoints.length < 2) return null;
    const coordinates = idrPoints.map((pt) => [pt.longitude, pt.latitude]);
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        },
      ],
    };
  }, [idrPoints]);

  // Handle Zoom & Recenter Actions with both imperative ref and state triggers
  const handleZoomIn = () => {
    const nextZ = Math.min(zoomLevel + 1.0, 19.0);
    setZoomLevel(nextZ);
    if (cameraRef.current) {
      if (typeof cameraRef.current.zoomTo === 'function') {
        cameraRef.current.zoomTo(nextZ, 250);
      } else if (typeof cameraRef.current.setStop === 'function') {
        cameraRef.current.setStop({ zoomLevel: nextZ, zoom: nextZ, duration: 250 });
      }
    }
  };

  const handleZoomOut = () => {
    const nextZ = Math.max(zoomLevel - 1.0, 10.0);
    setZoomLevel(nextZ);
    if (cameraRef.current) {
      if (typeof cameraRef.current.zoomTo === 'function') {
        cameraRef.current.zoomTo(nextZ, 250);
      } else if (typeof cameraRef.current.setStop === 'function') {
        cameraRef.current.setStop({ zoomLevel: nextZ, zoom: nextZ, duration: 250 });
      }
    }
  };

  const handleRecenter = () => {
    setZoomLevel(15.5);
    if (cameraRef.current) {
      if (typeof cameraRef.current.flyTo === 'function') {
        cameraRef.current.flyTo({ center: [pose.longitude, pose.latitude], centerCoordinate: [pose.longitude, pose.latitude], zoom: 15.5, zoomLevel: 15.5, duration: 400 });
      } else if (typeof cameraRef.current.setStop === 'function') {
        cameraRef.current.setStop({ centerCoordinate: [pose.longitude, pose.latitude], zoomLevel: 15.5, duration: 400 });
      }
    }
  };

  // Render Real MapLibre Native Map View
  if (isNativeMapSupported && MapComponent) {
    return (
      <View style={styles.container}>
        <MapComponent
          style={styles.mapView}
          mapStyle={styleUrl}
          styleURL={styleUrl}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
        >
          {CameraComponent && (
            <CameraComponent
              ref={cameraRef}
              zoom={zoomLevel}
              zoomLevel={zoomLevel}
              center={[pose.longitude, pose.latitude]}
              centerCoordinate={[pose.longitude, pose.latitude]}
              heading={pose.heading}
              pitch={35}
              animationMode="flyTo"
              animationDuration={300}
            />
          )}

          {/* GNSS Vector Path Layer */}
          {gnssGeoJson && SourceComponent && LineLayerComponent && (
            <SourceComponent id="gnssPathSource" shape={gnssGeoJson}>
              <LineLayerComponent
                id="gnssPathLayer"
                style={{
                  lineColor: theme.colors.gnssPath,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </SourceComponent>
          )}

          {/* Dead Reckoning Vector Path Layer (Dashed Orange) */}
          {isDenied && idrGeoJson && SourceComponent && LineLayerComponent && (
            <SourceComponent id="idrPathSource" shape={idrGeoJson}>
              <LineLayerComponent
                id="idrPathLayer"
                style={{
                  lineColor: theme.colors.idrPath,
                  lineWidth: 4,
                  lineDasharray: [2, 2],
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </SourceComponent>
          )}

          {/* Vehicle Position Marker */}
          {MarkerComponent && (
            <MarkerComponent
              id="vehicleMarkerPoint"
              lngLat={[pose.longitude, pose.latitude]}
              coordinate={[pose.longitude, pose.latitude]}
            >
              <VehicleMarker heading={pose.heading} isDenied={isDenied} />
            </MarkerComponent>
          )}
        </MapComponent>

        {/* Development Map Debug Indicator */}
        <View style={[styles.debugTag, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.debugText, { color: theme.colors.primary }]}>MAPENGINE: MAPLIBRE GL</Text>
          <Text style={[styles.debugSub, { color: theme.colors.textMuted }]}>OSM VECTOR • LOADED</Text>
        </View>

        {/* Floating Map Controls */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
        />
      </View>
    );
  }

  // Explicit Development Error State (NO FAKE MAP FALLBACK!)
  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.errorIconBox}>
        <Text style={styles.errorIcon}>⚠️</Text>
      </View>
      <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>MAP DATA UNAVAILABLE</Text>
      <Text style={[styles.errorDesc, { color: theme.colors.textSecondary }]}>
        MapLibre native GL module is not loaded. Please run the native Android development APK to view real geographic OpenStreetMap tiles.
      </Text>
      <Text style={[styles.errorSub, { color: theme.colors.textMuted }]}>
        Coordinate: {pose.latitude.toFixed(4)}° N, {pose.longitude.toFixed(4)}° E
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mapView: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  debugTag: {
    position: 'absolute',
    top: 12,
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 15,
  },
  debugText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  debugSub: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
  errorContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  errorIcon: {
    fontSize: 22,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  errorSub: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

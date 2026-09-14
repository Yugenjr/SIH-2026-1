import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { VehiclePose, TrajectoryPoint, GnssStatus, Destination, Route } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import { mapStyleService } from '../../services/map/MapStyleService';
import { VehicleMarker } from './VehicleMarker';
import { DestinationMarker } from './DestinationMarker';
import { RoutePolylineLayer } from './RoutePolylineLayer';
import { MapControls } from './MapControls';
import { useSmoothMarker } from '../../hooks/useSmoothMarker';
import { calculateHaversineDistance } from '../../utils/geo';

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

export type CameraFollowState = 'FOLLOWING' | 'USER_INTERACTED';

interface NavigationMapProps {
  pose: VehiclePose;
  gnssPoints: TrajectoryPoint[];
  idrPoints: TrajectoryPoint[];
  gnssStatus: GnssStatus;
  lastKnownPose: VehiclePose | null;
  isNavigating?: boolean;
  destination?: Destination | null;
  route?: Route | null;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  pose,
  gnssPoints,
  idrPoints,
  gnssStatus,
  isNavigating = false,
  destination,
  route,
}) => {
  const { isDark, theme } = useAppTheme();
  const [zoomLevel, setZoomLevel] = useState(15.5);
  const [cameraState, setCameraState] = useState<CameraFollowState>('FOLLOWING');
  const isFollowing = cameraState === 'FOLLOWING';
  const cameraRef = useRef<any>(null);
  const lastCamLatRef = useRef<number>(0);
  const lastCamLonRef = useRef<number>(0);
  const isDenied = gnssStatus === 'DENIED';

  // Smooth Marker Animation Hook (Stage C.1 Source of Truth)
  const { animatedLat, animatedLon, animatedHeading } = useSmoothMarker(pose);

  // Position validity check for safety (prevents camera jumps to [0,0] or null)
  const hasValidPosition = Boolean(
    animatedLat &&
    animatedLon &&
    Number.isFinite(animatedLat) &&
    Number.isFinite(animatedLon) &&
    (animatedLat !== 0 || animatedLon !== 0)
  );

  const styleUrl = mapStyleService.getStyleUrlForTheme(isDark);

  const MapComponent = MapLibre ? (MapLibre.Map || MapLibre.MapView) : null;
  const CameraComponent = MapLibre ? MapLibre.Camera : null;
  const SourceComponent = MapLibre ? (MapLibre.GeoJSONSource || MapLibre.ShapeSource) : null;
  const LineLayerComponent = MapLibre ? MapLibre.LineLayer : null;
  const MarkerComponent = MapLibre ? (MapLibre.Marker || MapLibre.PointAnnotation) : null;

  const isNativeMapSupported = Platform.OS !== 'web' && MapComponent != null;

  // Re-enable camera follow when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setCameraState('FOLLOWING');
    }
  }, [isNavigating]);

  // Camera transition to Destination when a new destination is selected
  useEffect(() => {
    if (destination && destination.latitude && destination.longitude && cameraRef.current && !route) {
      setCameraState('USER_INTERACTED');
      if (typeof cameraRef.current.flyTo === 'function') {
        cameraRef.current.flyTo({
          center: [destination.longitude, destination.latitude],
          centerCoordinate: [destination.longitude, destination.latitude],
          zoom: 15.0,
          zoomLevel: 15.0,
          duration: 800,
        });
      } else if (typeof cameraRef.current.setStop === 'function') {
        cameraRef.current.setStop({
          centerCoordinate: [destination.longitude, destination.latitude],
          zoomLevel: 15.0,
          duration: 800,
        });
      }
    }
  }, [destination?.id, destination?.latitude, destination?.longitude]);

  // Route Overview Camera Framing Effect: Fit bounds to include vehicle position, route geometry, and destination
  useEffect(() => {
    if (route && route.geometry && route.geometry.length >= 2 && cameraRef.current) {
      let minLat = pose.latitude || route.geometry[0][1];
      let maxLat = pose.latitude || route.geometry[0][1];
      let minLon = pose.longitude || route.geometry[0][0];
      let maxLon = pose.longitude || route.geometry[0][0];

      for (const [lon, lat] of route.geometry) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }

      setCameraState('USER_INTERACTED');

      if (typeof cameraRef.current.fitBounds === 'function') {
        cameraRef.current.fitBounds(
          [maxLon, maxLat],
          [minLon, minLat],
          [100, 40, 140, 40],
          800
        );
      } else if (typeof cameraRef.current.setStop === 'function') {
        cameraRef.current.setStop({
          bounds: {
            ne: [maxLon, maxLat],
            sw: [minLon, minLat],
            paddingTop: 100,
            paddingBottom: 140,
            paddingLeft: 40,
            paddingRight: 40,
          },
          duration: 800,
        });
      }
    }
  }, [route?.id]);

  // C.2 Real-Time Camera Follow Effect: Track C.1 smoothed vehicle position [animatedLon, animatedLat]
  useEffect(() => {
    if (cameraState === 'FOLLOWING' && animatedLat && animatedLon && cameraRef.current) {
      const dist = calculateHaversineDistance(
        lastCamLatRef.current,
        lastCamLonRef.current,
        animatedLat,
        animatedLon
      );

      // Issue smooth camera update only when displacement > 0.3m (prevents command overload & jitter)
      if (dist > 0.3 || lastCamLatRef.current === 0) {
        lastCamLatRef.current = animatedLat;
        lastCamLonRef.current = animatedLon;

        if (typeof cameraRef.current.flyTo === 'function') {
          cameraRef.current.flyTo({
            center: [animatedLon, animatedLat],
            centerCoordinate: [animatedLon, animatedLat],
            zoom: zoomLevel,
            zoomLevel: zoomLevel,
            duration: 350,
          });
        } else if (typeof cameraRef.current.setStop === 'function') {
          cameraRef.current.setStop({
            centerCoordinate: [animatedLon, animatedLat],
            zoomLevel: zoomLevel,
            duration: 350,
          });
        }
      }
    }
  }, [animatedLat, animatedLon, cameraState, zoomLevel]);

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

  // Handle Zoom & Recenter Actions
  const handleZoomIn = () => {
    setZoomLevel((prevZoom) => {
      const nextZ = Math.min(Math.round((prevZoom + 1.0) * 10) / 10, 19.0);
      if (cameraRef.current) {
        if (typeof cameraRef.current.zoomTo === 'function') {
          cameraRef.current.zoomTo(nextZ, 250);
        } else if (typeof cameraRef.current.setStop === 'function') {
          cameraRef.current.setStop({ zoomLevel: nextZ, zoom: nextZ, duration: 250 });
        }
      }
      return nextZ;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoom) => {
      const nextZ = Math.max(Math.round((prevZoom - 1.0) * 10) / 10, 10.0);
      if (cameraRef.current) {
        if (typeof cameraRef.current.zoomTo === 'function') {
          cameraRef.current.zoomTo(nextZ, 250);
        } else if (typeof cameraRef.current.setStop === 'function') {
          cameraRef.current.setStop({ zoomLevel: nextZ, zoom: nextZ, duration: 250 });
        }
      }
      return nextZ;
    });
  };

  const handleRecenter = () => {
    if (!hasValidPosition || !cameraRef.current) return;

    // Reset displacement reference so subsequent camera follow updates proceed cleanly
    lastCamLatRef.current = animatedLat;
    lastCamLonRef.current = animatedLon;

    setCameraState('FOLLOWING');

    if (typeof cameraRef.current.flyTo === 'function') {
      cameraRef.current.flyTo({
        center: [animatedLon, animatedLat],
        centerCoordinate: [animatedLon, animatedLat],
        zoom: zoomLevel,
        zoomLevel: zoomLevel,
        duration: 400,
      });
    } else if (typeof cameraRef.current.setStop === 'function') {
      cameraRef.current.setStop({
        centerCoordinate: [animatedLon, animatedLat],
        zoomLevel: zoomLevel,
        duration: 400,
      });
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
          scrollEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          onRegionWillChange={(feature: any) => {
            if (feature?.properties?.isUserAction) {
              if (cameraState === 'FOLLOWING') {
                setCameraState('USER_INTERACTED');
              }
            }
          }}
          onRegionIsChanging={(feature: any) => {
            if (feature?.properties?.isUserAction) {
              if (cameraState === 'FOLLOWING') {
                setCameraState('USER_INTERACTED');
              }
            }
          }}
        >
          {CameraComponent && (
            <CameraComponent
              ref={cameraRef}
              zoom={zoomLevel}
              zoomLevel={zoomLevel}
              center={[pose.longitude, pose.latitude]}
              centerCoordinate={[pose.longitude, pose.latitude]}
              heading={pose.heading || 0}
              pitch={35}
              animationMode="flyTo"
              animationDuration={300}
            />
          )}

          {/* Offline OSM Route Polyline Layer */}
          {route && MapLibre && (
            <RoutePolylineLayer route={route} MapLibre={MapLibre} />
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

          {/* Dead Reckoning Vector Path Layer (Dashed Orange/Cyan) */}
          {idrGeoJson && SourceComponent && LineLayerComponent && (
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
              lngLat={[animatedLon, animatedLat]}
              coordinate={[animatedLon, animatedLat]}
            >
              <VehicleMarker heading={animatedHeading} isDenied={isDenied} />
            </MarkerComponent>
          )}

          {/* Destination Marker */}
          {destination && MarkerComponent && (
            <MarkerComponent
              id="destinationMarkerPoint"
              lngLat={[destination.longitude, destination.latitude]}
              coordinate={[destination.longitude, destination.latitude]}
            >
              <DestinationMarker name={destination.name} />
            </MarkerComponent>
          )}
        </MapComponent>

        {/* Compact Top-Right Compass Button (36x36dp) */}
        <TouchableOpacity
          style={[styles.compassBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
          onPress={() => {
            if (cameraRef.current) {
              if (typeof cameraRef.current.setStop === 'function') {
                cameraRef.current.setStop({ heading: 0, duration: 300 });
              }
            }
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.compassNeedle, { transform: [{ rotate: `${(pose.heading || 0) * -1}deg` }] }]}>
            <View style={styles.needleNorth} />
            <View style={styles.needleSouth} />
          </View>
        </TouchableOpacity>

        {/* Small Unobtrusive Map Attribution */}
        <View style={styles.attributionBox}>
          <Text style={[styles.attributionText, { color: theme.colors.textMuted }]}>
            © OpenStreetMap contributors, OpenFreeMap
          </Text>
        </View>

        {/* Floating Map Controls */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
          isFollowing={isFollowing}
          hasValidPosition={hasValidPosition}
        />
      </View>
    );
  }

  // Explicit Error State (NO FAKE MAP FALLBACK!)
  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.errorIconBox}>
        <Text style={styles.errorIcon}>⚠️</Text>
      </View>
      <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>MAP UNAVAILABLE</Text>
      <Text style={[styles.errorDesc, { color: theme.colors.textSecondary }]}>
        MapLibre native GL module is not loaded. Please run the native Android development APK to view real OpenStreetMap vector tiles.
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
  compassBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compassNeedle: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  needleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EF4444',
  },
  needleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#94A3B8',
  },
  attributionBox: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 10,
  },
  attributionText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.85,
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

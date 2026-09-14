export type GnssStatus = 'AVAILABLE' | 'DENIED' | 'RECOVERING' | 'WAITING' | 'SIGNAL_LOST' | 'PERMISSION_REQUIRED';
export type NavigationMode = 'GNSS NAVIGATION' | 'WAITING FOR LOCATION' | 'LOCATION PERMISSION REQUIRED' | 'GNSS SIGNAL LOST' | 'DEAD RECKONING ACTIVE';
export type ImuStatus = 'CONNECTED' | 'DISCONNECTED';
export type MapStatus = 'OFFLINE VECTOR' | 'LOADING' | 'AVAILABLE';
export type ActiveTab = 'NAVIGATE' | 'SYSTEM' | 'SETTINGS';
export type LocationPermissionStatus = 'UNDETERMINED' | 'GRANTED' | 'DENIED' | 'SERVICES_DISABLED';

export interface LocationFix {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null; // m/s
  bearing: number | null; // degrees (GNSS course)
}

export interface VehiclePose {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  heading: number | null; // degrees 0-360 (GNSS course)
  speed: number | null; // km/h
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  type: 'gnss' | 'idr' | 'map_matched';
  timestamp: number;
}

export interface SensorTelemetry {
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  timestamp: number;
}

export interface NavigationState {
  pose: VehiclePose;
  currentFix: LocationFix | null;
  positionUncertainty: number | null; // meters
  gnssStatus: GnssStatus;
  navigationMode: NavigationMode;
  locationPermissionStatus: LocationPermissionStatus;
  updateRateHz: number;
  imuStatus: ImuStatus;
  mapStatus: MapStatus;
  isNavigating: boolean;
  outageDurationSeconds: number;
  confidence: number; // percentage 0-100%
  processingLatencyMs: number;
  lastKnownGnssPose: VehiclePose | null;
  gnssTrajectory: TrajectoryPoint[];
  idrTrajectory: TrajectoryPoint[];
  mapMatchedTrajectory: TrajectoryPoint[];
  activeBannerMessage: string | null;
  activeTab: ActiveTab;
  telemetryHistory: SensorTelemetry[];
}

export interface SystemInfo {
  appName: string;
  fullName: string;
  tagline: string;
  version: string;
  isDemoMode: boolean;
  benchmark: {
    dataset: string;
    m028Baseline: string;
    m029Candidate: string;
    improvement: string;
    disclaimer: string;
  };
}

export type GnssStatus = 'AVAILABLE' | 'DENIED' | 'RECOVERING';
export type NavigationMode = 'GNSS NAVIGATION' | 'DEAD RECKONING ACTIVE' | 'GNSS REACQUIRED';
export type ImuStatus = 'CONNECTED' | 'DISCONNECTED';
export type MapStatus = 'OFFLINE VECTOR' | 'LOADING' | 'AVAILABLE';
export type ActiveTab = 'NAVIGATE' | 'SYSTEM' | 'SETTINGS';

export interface VehiclePose {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  heading: number; // degrees 0-360
  speed: number; // km/h
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
  positionUncertainty: number; // meters
  gnssStatus: GnssStatus;
  navigationMode: NavigationMode;
  imuStatus: ImuStatus;
  mapStatus: MapStatus;
  isNavigating: boolean;
  demoStateIndex: number; // 0: GNSS AVAILABLE, 1: GNSS DENIED, 2: RECOVERING
  outageDurationSeconds: number; // seconds spent in GNSS loss
  confidence: number; // percentage 0-100%
  processingLatencyMs: number; // e.g. 9.4 ms
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


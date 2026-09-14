export type GnssStatus = 'AVAILABLE' | 'DENIED' | 'RECOVERING';
export type NavigationMode = 'GNSS + INS' | 'IDR' | 'FUSION';
export type ImuStatus = 'ACTIVE' | 'INACTIVE';
export type MapStatus = 'OFFLINE' | 'LOADING' | 'AVAILABLE';

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

export interface NavigationState {
  pose: VehiclePose;
  positionUncertainty: number; // meters
  gnssStatus: GnssStatus;
  navigationMode: NavigationMode;
  imuStatus: ImuStatus;
  mapStatus: MapStatus;
  isNavigating: boolean;
  demoStateIndex: number; // 0: GNSS AVAILABLE, 1: GNSS DENIED, 2: RECOVERING
  gnssTrajectory: TrajectoryPoint[];
  idrTrajectory: TrajectoryPoint[];
  mapMatchedTrajectory: TrajectoryPoint[];
  activeBannerMessage: string | null;
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

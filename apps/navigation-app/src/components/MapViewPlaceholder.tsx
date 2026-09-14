import React from 'react';
import { NavigationMap } from './map/NavigationMap';
import { VehiclePose, TrajectoryPoint, GnssStatus } from '../types/navigation';

interface MapViewProps {
  pose: VehiclePose;
  gnssPoints: TrajectoryPoint[];
  idrPoints: TrajectoryPoint[];
  gnssStatus: GnssStatus;
  lastKnownPose: VehiclePose | null;
  confidence?: number;
  isNavigating?: boolean;
}

export const MapViewPlaceholder: React.FC<MapViewProps> = (props) => {
  return <NavigationMap {...props} />;
};

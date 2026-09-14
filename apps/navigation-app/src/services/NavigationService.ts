import {
  NavigationState,
  LocationFix,
  TrajectoryPoint,
  ActiveTab,
} from '../types/navigation';
import { LocationService } from './LocationService';

type StateListener = (state: NavigationState) => void;

// Default initial state (Bengaluru center fallback before fix)
const INITIAL_STATE: NavigationState = {
  pose: {
    x: 0,
    y: 0,
    latitude: 12.9716,
    longitude: 77.5946,
    heading: null,
    speed: null,
  },
  currentFix: null,
  positionUncertainty: null,
  gnssStatus: 'WAITING',
  navigationMode: 'WAITING FOR LOCATION',
  locationPermissionStatus: 'UNDETERMINED',
  updateRateHz: 0,
  imuStatus: 'CONNECTED',
  mapStatus: 'AVAILABLE',
  isNavigating: false,
  outageDurationSeconds: 0,
  confidence: 100,
  processingLatencyMs: 4.2,
  lastKnownGnssPose: null,
  gnssTrajectory: [],
  idrTrajectory: [],
  mapMatchedTrajectory: [],
  activeBannerMessage: null,
  activeTab: 'NAVIGATE',
  telemetryHistory: [],
};

export class NavigationService {
  private state: NavigationState = { ...INITIAL_STATE };
  private listeners: Set<StateListener> = new Set();
  private locationService: LocationService = new LocationService();
  private lastFixTimestamp: number = 0;
  private signalLossTimer: NodeJS.Timeout | null = null;
  private updateRateCounter: number = 0;
  private updateRateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startRateCalculator();
  }

  public getState(): NavigationState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private setState(updates: Partial<NavigationState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Start Live Navigation Session
   */
  public async startNavigation(): Promise<void> {
    const permStatus = await this.locationService.requestPermissions();

    if (permStatus !== 'GRANTED') {
      this.setState({
        isNavigating: false,
        locationPermissionStatus: permStatus,
        gnssStatus: 'PERMISSION_REQUIRED',
        navigationMode: 'LOCATION PERMISSION REQUIRED',
        activeBannerMessage:
          permStatus === 'SERVICES_DISABLED'
            ? 'LOCATION SERVICES DISABLED ON PHONE'
            : 'LOCATION PERMISSION REQUIRED',
      });
      return;
    }

    this.setState({
      isNavigating: true,
      locationPermissionStatus: 'GRANTED',
      gnssStatus: 'WAITING',
      navigationMode: 'WAITING FOR LOCATION',
      activeBannerMessage: 'WAITING FOR GNSS FIX...',
      gnssTrajectory: [],
    });

    // Start watching position
    const success = await this.locationService.startTracking(
      (fix: LocationFix) => this.handleLocationFix(fix),
      (errorMsg: string) => this.handleLocationError(errorMsg)
    );

    if (!success) {
      this.setState({
        isNavigating: false,
        gnssStatus: 'PERMISSION_REQUIRED',
        navigationMode: 'LOCATION PERMISSION REQUIRED',
        activeBannerMessage: 'FAILED TO ACCESS PHONE LOCATION',
      });
    } else {
      this.resetSignalLossTimer();
    }
  }

  /**
   * Stop Live Navigation Session
   */
  public stopNavigation(): void {
    this.locationService.stopTracking();
    this.clearSignalLossTimer();

    this.setState({
      isNavigating: false,
      gnssStatus: 'WAITING',
      navigationMode: 'WAITING FOR LOCATION',
      activeBannerMessage: null,
      updateRateHz: 0,
    });
  }

  public setActiveTab(tab: ActiveTab): void {
    this.setState({ activeTab: tab });
  }

  /**
   * Process incoming real location fix from Android Location API
   */
  private handleLocationFix(fix: LocationFix): void {
    this.lastFixTimestamp = Date.now();
    this.updateRateCounter++;
    this.resetSignalLossTimer();

    // Convert speed from m/s to km/h if available
    const speedKmH =
      fix.speed !== null && fix.speed >= 0 ? parseFloat((fix.speed * 3.6).toFixed(1)) : null;

    // Heading (GNSS Course) in degrees
    const heading = fix.bearing !== null ? Math.round(fix.bearing) : null;

    const newPose = {
      x: 0,
      y: 0,
      latitude: fix.latitude,
      longitude: fix.longitude,
      heading,
      speed: speedKmH,
    };

    // New trajectory point
    const newPoint: TrajectoryPoint = {
      x: 0,
      y: 0,
      latitude: fix.latitude,
      longitude: fix.longitude,
      type: 'gnss',
      timestamp: fix.timestamp,
    };

    const updatedTrajectory = [...this.state.gnssTrajectory, newPoint];

    this.setState({
      pose: newPose,
      currentFix: fix,
      positionUncertainty: fix.accuracy !== null ? parseFloat(fix.accuracy.toFixed(1)) : null,
      gnssStatus: 'AVAILABLE',
      navigationMode: 'GNSS NAVIGATION',
      lastKnownGnssPose: newPose,
      gnssTrajectory: updatedTrajectory,
      activeBannerMessage: null,
      confidence: 100,
    });
  }

  private handleLocationError(errorMsg: string): void {
    this.setState({
      gnssStatus: 'PERMISSION_REQUIRED',
      navigationMode: 'LOCATION PERMISSION REQUIRED',
      activeBannerMessage: errorMsg,
    });
  }

  /**
   * Signal loss detection timer (6 second timeout)
   */
  private resetSignalLossTimer(): void {
    this.clearSignalLossTimer();
    this.signalLossTimer = setTimeout(() => {
      if (this.state.isNavigating) {
        this.setState({
          gnssStatus: 'SIGNAL_LOST',
          navigationMode: 'GNSS SIGNAL LOST',
          activeBannerMessage: 'GNSS SIGNAL LOST — WAITING FOR FIX',
        });
      }
    }, 6000);
  }

  private clearSignalLossTimer(): void {
    if (this.signalLossTimer) {
      clearTimeout(this.signalLossTimer);
      this.signalLossTimer = null;
    }
  }

  /**
   * Real Hz update rate calculator
   */
  private startRateCalculator(): void {
    this.updateRateTimer = setInterval(() => {
      const hz = this.updateRateCounter;
      this.updateRateCounter = 0;
      if (this.state.isNavigating && hz !== this.state.updateRateHz) {
        this.setState({ updateRateHz: hz });
      }
    }, 1000);
  }
}

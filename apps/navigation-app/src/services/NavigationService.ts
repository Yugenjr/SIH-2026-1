import {
  NavigationState,
  LocationFix,
  TrajectoryPoint,
  ActiveTab,
  GnssDiagnostics,
  FilteredGnssPose,
  VehiclePose,
  Destination,
  Route,
  RouteStatus,
  RouteError,
  TurnByTurnNavigationStatus,
  NavigationInstruction,
} from '../types/navigation';
import { LocationService } from './LocationService';
import { GnssFilter } from './GnssFilter';
import { speedPipeline } from './SpeedPipeline';
import { headingPipeline } from './HeadingPipeline';
import { gnssOutageDetector } from './GnssOutageDetector';
import { deadReckoningEngine, ImuSample } from './DeadReckoningEngine';
import { deviceSensorStream } from './DeviceSensorStream';
import { mapMatcher } from './map/MapMatcher';
import { offlineMapManager } from './map/OfflineMapManager';
import { offlineOsmRoadNetworkProvider } from './map/OfflineOsmRoadNetworkProvider';
import { unavailableRoadNetworkProvider } from './map/UnavailableRoadNetworkProvider';
import { offlineOsmRouteEngine } from './routing/OfflineOsmRouteEngine';
import { RouteCalculationResult } from './routing/RouteEngine';
import { routeNavigationEngine } from './navigation/RouteNavigationEngine';
import { calculateHaversineDistance, calculateMedian } from '../utils/geo';

type StateListener = (state: NavigationState) => void;

const DEFAULT_DIAGNOSTICS: GnssDiagnostics = {
  fixCount: 0,
  acceptedFixCount: 0,
  rejectedOutlierCount: 0,
  lastFixAgeSeconds: 0,
  updateRateHz: 0,
  meanIntervalMs: 0,
  medianIntervalMs: 0,
  minIntervalMs: 0,
  maxIntervalMs: 0,
  currentAccuracy: null,
  minAccuracy: null,
  maxAccuracy: null,
  meanAccuracy: null,
  reportedSpeedKmH: null,
  hasSpeed: false,
  derivedSpeedKmH: null,
  filteredSpeedKmH: null,
  reportedBearing: null,
  hasBearing: false,
  filteredHeadingDeg: null,
  filterState: 'INITIALIZING',
  rawJitterMaxMeters: 0,
  rawJitterMeanMeters: 0,
  filteredJitterMaxMeters: 0,
  filteredJitterMeanMeters: 0,
  filterLatencyMs: 0,
  rawLatitude: null,
  rawLongitude: null,
  filteredLatitude: null,
  filteredLongitude: null,
};

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
  filteredPose: null,
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
  activeTab: 'SYSTEM',
  telemetryHistory: [],
  diagnostics: { ...DEFAULT_DIAGNOSTICS },
};

export class NavigationService {
  private state: NavigationState = { ...INITIAL_STATE };
  private listeners: Set<StateListener> = new Set();
  private locationService: LocationService = new LocationService();
  private gnssFilter: GnssFilter = new GnssFilter();
  private lastFixTimestamp: number = 0;
  private signalLossTimer: NodeJS.Timeout | null = null;
  private staleFixTicker: NodeJS.Timeout | null = null;
  private updateRateCounter: number = 0;
  private updateRateTimer: NodeJS.Timeout | null = null;

  // Diagnostic history buffers
  private fixHistory: LocationFix[] = [];
  private filteredPoseHistory: FilteredGnssPose[] = [];
  private intervalsMs: number[] = [];
  private accuraciesM: number[] = [];

  // DR Trajectory Thinning References (Stage 4C)
  private lastDrTrajLat: number = 0;
  private lastDrTrajLon: number = 0;
  private lastDrTrajTime: number = 0;

  constructor() {
    this.startRateCalculator();
    this.startStaleTicker();
    this.startNavigation();

    // Stage 4E.2 Scalable Offline Map Manager Provider Selection
    if (offlineMapManager.isAvailable()) {
      mapMatcher.setProvider(offlineMapManager);
    } else if (offlineOsmRoadNetworkProvider.isAvailable()) {
      mapMatcher.setProvider(offlineOsmRoadNetworkProvider);
    } else {
      mapMatcher.setProvider(unavailableRoadNetworkProvider);
    }

    // Subscribe to physical IMU sensor stream callbacks (Stage 4B)
    deviceSensorStream.subscribe((sample: ImuSample) => this.handleImuSample(sample));
    deviceSensorStream.startStream();
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

    // Reset diagnostic history buffers for fresh session
    this.fixHistory = [];
    this.intervalsMs = [];
    this.accuraciesM = [];
    this.lastDrTrajLat = 0;
    this.lastDrTrajLon = 0;
    this.lastDrTrajTime = 0;

    this.setState({
      isNavigating: true,
      locationPermissionStatus: 'GRANTED',
      gnssStatus: 'WAITING',
      navigationMode: 'WAITING FOR LOCATION',
      activeBannerMessage: 'WAITING FOR GNSS FIX...',
      gnssTrajectory: [],
      idrTrajectory: [],
      drDistanceMeters: 0,
      drState: 'DR_READY',
      diagnostics: { ...DEFAULT_DIAGNOSTICS },
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

  public setDestination(destination: Destination | null): void {
    this.setState({
      destination,
      navigationIntent: destination ? 'DESTINATION_SELECTED' : 'IDLE',
      route: null,
      routeStatus: 'NONE',
      routeError: null,
      turnByTurnStatus: 'IDLE',
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestinationMeters: undefined,
    });
  }

  public clearDestination(): void {
    routeNavigationEngine.reset();
    this.setState({
      destination: null,
      navigationIntent: 'IDLE',
      route: null,
      routeStatus: 'NONE',
      routeError: null,
      turnByTurnStatus: 'IDLE',
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestinationMeters: undefined,
    });
  }

  /**
   * Generates a real offline OSM route from current vehicle position (GNSS or DR) to selected destination.
   */
  public async calculateRoute(): Promise<RouteCalculationResult> {
    if (!this.state.destination) {
      const errRes: RouteCalculationResult = {
        success: false,
        status: 'ERROR',
        error: 'NO_DESTINATION_ROAD',
        errorMessage: 'No destination selected.',
      };
      this.setState({
        route: null,
        routeStatus: 'ERROR',
        routeError: 'NO_DESTINATION_ROAD',
        turnByTurnStatus: 'IDLE',
      });
      return errRes;
    }

    const origin = {
      latitude: this.state.pose.latitude,
      longitude: this.state.pose.longitude,
    };

    const destination = {
      latitude: this.state.destination.latitude,
      longitude: this.state.destination.longitude,
    };

    this.setState({
      routeStatus: 'CALCULATING',
      routeError: null,
    });

    const result = await offlineOsmRouteEngine.calculateRoute(origin, destination);

    if (result.success && result.route) {
      routeNavigationEngine.reset();
      const progress = routeNavigationEngine.updateProgress(result.route, {
        latitude: origin.latitude,
        longitude: origin.longitude,
        heading: this.state.pose.heading,
      });

      this.setState({
        route: result.route,
        routeStatus: 'READY',
        routeError: null,
        turnByTurnStatus: 'FOLLOWING_ROUTE',
        currentInstruction: progress.currentInstruction,
        nextInstruction: progress.nextInstruction,
        distanceToDestinationMeters: progress.distanceToDestinationMeters,
      });
    } else {
      this.setState({
        route: null,
        routeStatus: 'ERROR',
        routeError: result.error || 'UNKNOWN',
        turnByTurnStatus: 'IDLE',
        activeBannerMessage: result.errorMessage || 'Failed to generate offline route.',
      });
    }

    return result;
  }

  public clearRoute(): void {
    routeNavigationEngine.reset();
    this.setState({
      route: null,
      routeStatus: 'NONE',
      routeError: null,
      turnByTurnStatus: 'IDLE',
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestinationMeters: undefined,
    });
  }

  public startTurnByTurnNavigation(): void {
    if (!this.state.route) return;

    routeNavigationEngine.reset();
    const progress = routeNavigationEngine.updateProgress(this.state.route, {
      latitude: this.state.pose.latitude,
      longitude: this.state.pose.longitude,
      heading: this.state.pose.heading,
    });

    this.setState({
      turnByTurnStatus: progress.navigationStatus === 'IDLE' ? 'FOLLOWING_ROUTE' : progress.navigationStatus,
      currentInstruction: progress.currentInstruction,
      nextInstruction: progress.nextInstruction,
      distanceToDestinationMeters: progress.distanceToDestinationMeters,
    });
  }

  public endTurnByTurnNavigation(): void {
    routeNavigationEngine.reset();
    this.setState({
      turnByTurnStatus: 'IDLE',
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestinationMeters: undefined,
    });
  }

  /**
   * Internal helper to calculate turn-by-turn progress updates from current pose (GNSS or DR).
   */
  private updateTurnByTurnProgress(pose: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  }): Partial<NavigationState> {
    if (!this.state.route || this.state.turnByTurnStatus === 'IDLE') {
      return {};
    }

    const progress = routeNavigationEngine.updateProgress(this.state.route, pose);

    return {
      turnByTurnStatus: progress.navigationStatus,
      currentInstruction: progress.currentInstruction,
      nextInstruction: progress.nextInstruction,
      distanceToDestinationMeters: progress.distanceToDestinationMeters,
    };
  }

  /**
   * Process incoming real location fix from Android Location API
   */
  private handleLocationFix(fix: LocationFix): void {
    const now = Date.now();
    this.lastFixTimestamp = now;
    this.updateRateCounter++;
    this.resetSignalLossTimer();

    // 1. Process raw fix through GnssFilter
    const filteredPose = this.gnssFilter.processFix(fix);

    // 1b. Process speed & heading through Speed & Heading Pipelines (Stage 2D & 2E Source of Truth)
    const speedEstimate = speedPipeline.computeSpeed(fix, filteredPose, false);
    const headingEstimate = headingPipeline.computeHeading(fix, filteredPose, false);
    filteredPose.speedEstimate = speedEstimate;
    filteredPose.headingEstimate = headingEstimate;

    // 1c. Process GNSS Outage State Machine (Stage 4A Source of Truth)
    const gnssNavState = gnssOutageDetector.processFix(fix, filteredPose);

    // 2. Store in history (max 200 fixes)
    this.fixHistory.push(fix);
    if (this.fixHistory.length > 200) {
      this.fixHistory.shift();
    }

    this.filteredPoseHistory.push(filteredPose);
    if (this.filteredPoseHistory.length > 200) {
      this.filteredPoseHistory.shift();
    }

    if (fix.deltaTimeMs !== undefined && fix.deltaTimeMs > 0) {
      this.intervalsMs.push(fix.deltaTimeMs);
      if (this.intervalsMs.length > 200) this.intervalsMs.shift();
    }

    if (fix.accuracy !== null && fix.accuracy > 0) {
      this.accuraciesM.push(fix.accuracy);
      if (this.accuraciesM.length > 200) this.accuraciesM.shift();
    }

    // 3. Diagnostics math
    const diagnostics = this.computeDiagnostics(fix, filteredPose);

    // 4. Construct Filtered Vehicle Pose (drives Navigation UI & Marker)
    const newPose: VehiclePose = {
      x: 0,
      y: 0,
      latitude: filteredPose.latitude,
      longitude: filteredPose.longitude,
      heading: headingEstimate.valid ? headingEstimate.headingDeg : null,
      speed: speedEstimate.valid ? speedEstimate.speedKmh : null,
      speedEstimate,
      headingEstimate,
    };

    // 5. New trajectory point (using filtered position for clean trajectory)
    const newPoint: TrajectoryPoint = {
      x: 0,
      y: 0,
      latitude: filteredPose.latitude,
      longitude: filteredPose.longitude,
      type: 'gnss',
      timestamp: fix.timestamp,
    };

    const updatedTrajectory = [...this.state.gnssTrajectory, newPoint];

    const isOutage = gnssNavState.state === 'GNSS_DENIED';
    const isDegraded = gnssNavState.state === 'GNSS_DEGRADED';
    const isRecovery = gnssNavState.state === 'GNSS_RECOVERY';

    // DR State Machine Handoff (Stage 4B / 4C)
    let currentDrState = this.state.drState || 'DR_READY';
    let currentPose = newPose;
    let updatedIdrTrajectory = this.state.idrTrajectory;

    if (!isOutage) {
      // GNSS Active / Recovering: Update DR Engine Origin with authoritative GNSS fix
      deadReckoningEngine.resetOrigin(
        filteredPose.latitude,
        filteredPose.longitude,
        headingEstimate.valid && headingEstimate.headingDeg !== null ? headingEstimate.headingDeg : 0,
        speedEstimate.valid && speedEstimate.speedMps !== null ? speedEstimate.speedMps : 0,
        fix.timestamp
      );
      currentDrState = 'DR_READY';
    } else {
      // GNSS Outage: Transition to DR_ACTIVE if eligible
      if (currentDrState !== 'DR_ACTIVE') {
        const originLat = gnssNavState.lastKnownPosition?.latitude || filteredPose.latitude;
        const originLon = gnssNavState.lastKnownPosition?.longitude || filteredPose.longitude;
        deadReckoningEngine.resetOrigin(
          originLat,
          originLon,
          headingEstimate.valid && headingEstimate.headingDeg !== null ? headingEstimate.headingDeg : 0,
          speedEstimate.valid && speedEstimate.speedMps !== null ? speedEstimate.speedMps : 0,
          fix.timestamp
        );
        currentDrState = 'DR_ACTIVE';

        // Stage 4C: Append DR Origin Point as the start of DR Trajectory
        const originPoint: TrajectoryPoint = {
          x: 0,
          y: 0,
          latitude: originLat,
          longitude: originLon,
          type: 'idr',
          timestamp: fix.timestamp,
        };
        this.lastDrTrajLat = originLat;
        this.lastDrTrajLon = originLon;
        this.lastDrTrajTime = fix.timestamp;
        updatedIdrTrajectory = [...this.state.idrTrajectory, originPoint];
      }
    }

    const mappedGnssStatus = isOutage
      ? 'SIGNAL_LOST'
      : isDegraded || isRecovery
      ? 'RECOVERING'
      : 'AVAILABLE';

    const mappedNavMode = (currentDrState === 'DR_ACTIVE')
      ? 'DEAD RECKONING ACTIVE'
      : isOutage
      ? 'GNSS SIGNAL LOST'
      : 'GNSS NAVIGATION';

    const bannerMessage = (currentDrState === 'DR_ACTIVE')
      ? `INERTIAL DEAD RECKONING ACTIVE • GNSS UNAVAILABLE`
      : isOutage
      ? `GNSS UNAVAILABLE • DR READY`
      : isDegraded
      ? `GNSS DEGRADED • Signal un-stabled`
      : isRecovery
      ? `GNSS RECOVERING (${gnssNavState.recoveryFixCount}/3 fixes)...`
      : null;

    const tbtUpdates = this.updateTurnByTurnProgress({
      latitude: filteredPose.latitude,
      longitude: filteredPose.longitude,
      heading: headingEstimate.valid ? headingEstimate.headingDeg : null,
    });

    this.setState({
      pose: currentPose,
      currentFix: fix,
      filteredPose,
      positionUncertainty: fix.accuracy !== null ? parseFloat(fix.accuracy.toFixed(1)) : null,
      gnssStatus: mappedGnssStatus,
      navigationMode: mappedNavMode,
      lastKnownGnssPose: newPose,
      gnssTrajectory: updatedTrajectory,
      idrTrajectory: updatedIdrTrajectory,
      activeBannerMessage: bannerMessage,
      confidence: isOutage ? 75 : isDegraded ? 60 : 100,
      outageDurationSeconds: Math.floor(gnssNavState.outageDurationMs / 1000),
      processingLatencyMs: filteredPose.latencyMs,
      diagnostics,
      speedEstimate,
      headingEstimate,
      gnssNavState,
      drState: currentDrState,
      ...tbtUpdates,
    });
  }

  /**
   * Handles incoming physical IMU sample callback for Dead Reckoning (Stage 4B & 4C)
   */
  private handleImuSample(sample: ImuSample): void {
    // Append to telemetry history for HUD widgets
    const telemetry = deviceSensorStream.getLatestTelemetry();
    const telemetryHistory = [...this.state.telemetryHistory.slice(-50), telemetry];

    // If DR is ACTIVE during GNSS Outage, step the DR Engine
    if (this.state.drState === 'DR_ACTIVE') {
      const drPose = deadReckoningEngine.processStep(sample);
      if (drPose && drPose.valid) {
        let updatedIdrTrajectory = this.state.idrTrajectory;

        // Stage 4C Point-Thinning: append point if displacement >= 0.5m OR dt >= 1000ms
        const distM = (this.lastDrTrajLat !== 0 && this.lastDrTrajLon !== 0)
          ? calculateHaversineDistance(this.lastDrTrajLat, this.lastDrTrajLon, drPose.latitude, drPose.longitude)
          : 999.0;

        const dtMs = drPose.timestamp - this.lastDrTrajTime;

        if (distM >= 0.5 || dtMs >= 1000) {
          const drTrajectoryPoint: TrajectoryPoint = {
            x: drPose.eastM,
            y: drPose.northM,
            latitude: drPose.latitude,
            longitude: drPose.longitude,
            type: 'idr',
            timestamp: drPose.timestamp,
          };

          this.lastDrTrajLat = drPose.latitude;
          this.lastDrTrajLon = drPose.longitude;
          this.lastDrTrajTime = drPose.timestamp;

          // Bounded memory array max 1000 points
          updatedIdrTrajectory = [...this.state.idrTrajectory.slice(-999), drTrajectoryPoint];
        }

        // Stage 4D.1 Map Matching Engine Pipeline
        mapMatcher.processPose(drPose).then((matchedDrPose) => {
          const tbtUpdates = this.updateTurnByTurnProgress({
            latitude: matchedDrPose.latitude,
            longitude: matchedDrPose.longitude,
            heading: matchedDrPose.headingDeg,
          });

          this.setState({
            drPose,
            matchedDrPose,
            mapMatchStatus: matchedDrPose.source === 'MAP_MATCHED' ? 'MATCHED' : 'MAP_MATCH_UNAVAILABLE',
            pose: {
              ...this.state.pose,
              latitude: matchedDrPose.latitude,
              longitude: matchedDrPose.longitude,
              heading: matchedDrPose.headingDeg,
              speed: parseFloat((drPose.speedMps * 3.6).toFixed(1)),
            },
            idrTrajectory: updatedIdrTrajectory,
            drDistanceMeters: drPose.drDistanceMeters,
            telemetryHistory,
            outageDurationSeconds: (this.state.gnssNavState && this.state.gnssNavState.lastValidFixTimestamp > 0)
              ? Math.floor((Date.now() - this.state.gnssNavState.lastValidFixTimestamp) / 1000)
              : Math.floor(drPose.drDurationMs / 1000),
            ...tbtUpdates,
          });
        }).catch(() => {
          const tbtUpdates = this.updateTurnByTurnProgress({
            latitude: drPose.latitude,
            longitude: drPose.longitude,
            heading: drPose.headingDeg,
          });

          this.setState({
            drPose,
            pose: {
              ...this.state.pose,
              latitude: drPose.latitude,
              longitude: drPose.longitude,
              heading: drPose.headingDeg,
              speed: parseFloat((drPose.speedMps * 3.6).toFixed(1)),
            },
            idrTrajectory: updatedIdrTrajectory,
            drDistanceMeters: drPose.drDistanceMeters,
            telemetryHistory,
            outageDurationSeconds: (this.state.gnssNavState && this.state.gnssNavState.lastValidFixTimestamp > 0)
              ? Math.floor((Date.now() - this.state.gnssNavState.lastValidFixTimestamp) / 1000)
              : Math.floor(drPose.drDurationMs / 1000),
            ...tbtUpdates,
          });
        });
        return;
      }
    }

    this.setState({ telemetryHistory });
  }

  private handleLocationError(errorMsg: string): void {
    this.setState({
      gnssStatus: 'PERMISSION_REQUIRED',
      navigationMode: 'LOCATION PERMISSION REQUIRED',
      activeBannerMessage: errorMsg,
    });
  }

  /**
   * Signal loss detection timer (4 second timeout threshold for stale fix)
   */
  private resetSignalLossTimer(): void {
    this.clearSignalLossTimer();
    this.signalLossTimer = setTimeout(() => {
      if (this.state.isNavigating) {
        const accStr =
          this.state.positionUncertainty !== null ? `${this.state.positionUncertainty} m` : '--';
        this.setState({
          gnssStatus: 'SIGNAL_LOST',
          navigationMode: 'GNSS SIGNAL LOST',
          activeBannerMessage: `GNSS SIGNAL LOST • Accuracy ${accStr}`,
        });
      }
    }, 4000);
  }

  private clearSignalLossTimer(): void {
    if (this.signalLossTimer) {
      clearTimeout(this.signalLossTimer);
      this.signalLossTimer = null;
    }
  }

  /**
   * Stale fix ticker runs every 500ms when navigating
   */
  private startStaleTicker(): void {
    this.staleFixTicker = setInterval(() => {
      if (this.state.isNavigating) {
        if (this.lastFixTimestamp === 0) {
          this.setState({
            diagnostics: {
              ...this.state.diagnostics,
              lastFixAgeSeconds: 0,
            },
          });
          return;
        }
        const ageSec = parseFloat(((Date.now() - this.lastFixTimestamp) / 1000).toFixed(1));
        const gnssNavState = gnssOutageDetector.evaluateStaleTick();
        const isOutage = gnssNavState.state === 'GNSS_DENIED';
        const isDegraded = gnssNavState.state === 'GNSS_DEGRADED';

        if (isOutage || isDegraded) {
          const accStr =
            this.state.positionUncertainty !== null ? `${this.state.positionUncertainty} m` : '--';
          const staleSpeed = speedPipeline.computeSpeed(
            this.state.currentFix,
            this.state.filteredPose,
            true
          );
          const staleHeading = headingPipeline.computeHeading(
            this.state.currentFix,
            this.state.filteredPose,
            true
          );
          const outageSec = Math.floor(gnssNavState.outageDurationMs / 1000);

          let currentDrState = this.state.drState || 'DR_READY';
          if (isOutage && currentDrState !== 'DR_ACTIVE') {
            const originLat = gnssNavState.lastKnownPosition?.latitude || this.state.pose.latitude;
            const originLon = gnssNavState.lastKnownPosition?.longitude || this.state.pose.longitude;
            const headingDeg = this.state.headingEstimate?.valid && this.state.headingEstimate.headingDeg !== null ? this.state.headingEstimate.headingDeg : 0;
            const speedMps = this.state.speedEstimate?.valid && this.state.speedEstimate.speedMps !== null ? this.state.speedEstimate.speedMps : 0;
            deadReckoningEngine.resetOrigin(originLat, originLon, headingDeg, speedMps, Date.now());
            currentDrState = 'DR_ACTIVE';
          }

          const bannerMsg = (currentDrState === 'DR_ACTIVE')
            ? `INERTIAL DEAD RECKONING ACTIVE • GNSS UNAVAILABLE`
            : isOutage
            ? `GNSS UNAVAILABLE • DR READY (Outage ${outageSec}s ago)`
            : `GNSS DEGRADED • Fix age ${ageSec}s (Accuracy ${accStr})`;

          this.setState({
            gnssStatus: isOutage ? 'SIGNAL_LOST' : 'RECOVERING',
            navigationMode: (currentDrState === 'DR_ACTIVE') ? 'DEAD RECKONING ACTIVE' : isOutage ? 'GNSS SIGNAL LOST' : 'GNSS NAVIGATION',
            outageDurationSeconds: outageSec,
            activeBannerMessage: bannerMsg,
            drState: currentDrState,
            pose: {
              ...this.state.pose,
              speed: null,
              heading: null,
              speedEstimate: staleSpeed,
              headingEstimate: staleHeading,
            },
            speedEstimate: staleSpeed,
            headingEstimate: staleHeading,
            gnssNavState,
            diagnostics: {
              ...this.state.diagnostics,
              lastFixAgeSeconds: ageSec,
            },
          });
        } else {
          this.setState({
            diagnostics: {
              ...this.state.diagnostics,
              lastFixAgeSeconds: ageSec,
            },
          });
        }
      }
    }, 500);
  }

  /**
   * Real Hz update rate calculator
   */
  private startRateCalculator(): void {
    this.updateRateTimer = setInterval(() => {
      const hz = this.updateRateCounter;
      this.updateRateCounter = 0;
      if (this.state.isNavigating) {
        this.setState({
          updateRateHz: hz,
          diagnostics: {
            ...this.state.diagnostics,
            updateRateHz: hz,
          },
        });
      }
    }, 1000);
  }

  /**
   * Compute comprehensive GNSS diagnostic metrics
   */
  private computeDiagnostics(
    currentFix: LocationFix,
    filteredPose?: FilteredGnssPose
  ): GnssDiagnostics {
    const fixCount = this.fixHistory.length;
    const acceptedFixCount = this.gnssFilter.getAcceptedFixCount();
    const rejectedOutlierCount = this.gnssFilter.getRejectedOutlierCount();
    const lastFixAgeSeconds = 0;

    // Interval stats
    let meanIntervalMs = 0;
    let medianIntervalMs = 0;
    let minIntervalMs = 0;
    let maxIntervalMs = 0;

    if (this.intervalsMs.length > 0) {
      const sumInt = this.intervalsMs.reduce((a, b) => a + b, 0);
      meanIntervalMs = Math.round(sumInt / this.intervalsMs.length);
      medianIntervalMs = Math.round(calculateMedian(this.intervalsMs));
      minIntervalMs = Math.min(...this.intervalsMs);
      maxIntervalMs = Math.max(...this.intervalsMs);
    }

    // Accuracy stats
    let minAccuracy: number | null = null;
    let maxAccuracy: number | null = null;
    let meanAccuracy: number | null = null;

    if (this.accuraciesM.length > 0) {
      minAccuracy = parseFloat(Math.min(...this.accuraciesM).toFixed(1));
      maxAccuracy = parseFloat(Math.max(...this.accuraciesM).toFixed(1));
      const sumAcc = this.accuraciesM.reduce((a, b) => a + b, 0);
      meanAccuracy = parseFloat((sumAcc / this.accuraciesM.length).toFixed(1));
    }

    // Speed & Course stats
    const reportedSpeedKmH =
      currentFix.hasSpeed && currentFix.speed !== null && currentFix.speed >= 0
        ? parseFloat((currentFix.speed * 3.6).toFixed(1))
        : null;

    const derivedSpeedKmH =
      currentFix.derivedSpeedMps !== undefined && currentFix.derivedSpeedMps >= 0
        ? parseFloat((currentFix.derivedSpeedMps * 3.6).toFixed(1))
        : null;

    const reportedBearing =
      currentFix.hasBearing && currentFix.bearing !== null
        ? Math.round(currentFix.bearing)
        : null;

    // Raw Position Jitter stats
    let rawJitterMaxMeters = 0;
    let rawJitterMeanMeters = 0;

    if (this.fixHistory.length >= 2) {
      const lats = this.fixHistory.map((f) => f.latitude);
      const lngs = this.fixHistory.map((f) => f.longitude);
      const medianLat = calculateMedian(lats);
      const medianLng = calculateMedian(lngs);

      const displacements = this.fixHistory.map((f) =>
        calculateHaversineDistance(medianLat, medianLng, f.latitude, f.longitude)
      );

      rawJitterMaxMeters = parseFloat(Math.max(...displacements).toFixed(2));
      const sumDisp = displacements.reduce((a, b) => a + b, 0);
      rawJitterMeanMeters = parseFloat((sumDisp / displacements.length).toFixed(2));
    }

    // Filtered Position Jitter stats
    let filteredJitterMaxMeters = 0;
    let filteredJitterMeanMeters = 0;

    if (this.filteredPoseHistory.length >= 2) {
      const fLats = this.filteredPoseHistory.map((p) => p.latitude);
      const fLngs = this.filteredPoseHistory.map((p) => p.longitude);
      const medianFLat = calculateMedian(fLats);
      const medianFLng = calculateMedian(fLngs);

      const fDisplacements = this.filteredPoseHistory.map((p) =>
        calculateHaversineDistance(medianFLat, medianFLng, p.latitude, p.longitude)
      );

      filteredJitterMaxMeters = parseFloat(Math.max(...fDisplacements).toFixed(2));
      const sumFDisp = fDisplacements.reduce((a, b) => a + b, 0);
      filteredJitterMeanMeters = parseFloat((sumFDisp / fDisplacements.length).toFixed(2));
    }

    return {
      fixCount,
      acceptedFixCount,
      rejectedOutlierCount,
      lastFixAgeSeconds,
      updateRateHz: this.state.updateRateHz,
      meanIntervalMs,
      medianIntervalMs,
      minIntervalMs,
      maxIntervalMs,
      currentAccuracy: currentFix.accuracy !== null ? parseFloat(currentFix.accuracy.toFixed(1)) : null,
      minAccuracy,
      maxAccuracy,
      meanAccuracy,
      reportedSpeedKmH,
      hasSpeed: currentFix.hasSpeed,
      derivedSpeedKmH,
      filteredSpeedKmH: filteredPose ? filteredPose.speedKmH : null,
      reportedBearing,
      hasBearing: currentFix.hasBearing,
      filteredHeadingDeg: filteredPose ? filteredPose.headingDeg : null,
      filterState: filteredPose ? filteredPose.filterState : 'INITIALIZING',
      rawJitterMaxMeters,
      rawJitterMeanMeters,
      filteredJitterMaxMeters,
      filteredJitterMeanMeters,
      filterLatencyMs: filteredPose ? filteredPose.latencyMs : 0,
      rawLatitude: currentFix.latitude,
      rawLongitude: currentFix.longitude,
      filteredLatitude: filteredPose ? filteredPose.latitude : null,
      filteredLongitude: filteredPose ? filteredPose.longitude : null,
    };
  }
}

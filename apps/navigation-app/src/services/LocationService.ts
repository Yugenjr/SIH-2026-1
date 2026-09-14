import * as Location from 'expo-location';
import { LocationFix, LocationPermissionStatus } from '../types/navigation';

export class LocationService {
  private subscription: Location.LocationSubscription | null = null;
  private onFixCallback: ((fix: LocationFix) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private isWatching: boolean = false;

  /**
   * Request foreground location permission and check location services availability
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        return 'SERVICES_DISABLED';
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        return 'GRANTED';
      } else {
        return 'DENIED';
      }
    } catch (e) {
      console.warn('[LocationService] Permission check failed:', e);
      return 'DENIED';
    }
  }

  /**
   * Start watching live Android location fixes
   */
  async startTracking(
    onFix: (fix: LocationFix) => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (this.isWatching) return true;

    this.onFixCallback = onFix;
    this.onErrorCallback = onError || null;

    try {
      const perm = await this.requestPermissions();
      if (perm !== 'GRANTED') {
        if (this.onErrorCallback) {
          this.onErrorCallback(
            perm === 'SERVICES_DISABLED'
              ? 'LOCATION SERVICES DISABLED'
              : 'LOCATION PERMISSION REQUIRED'
          );
        }
        return false;
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // 1 second update interval
          distanceInterval: 1, // 1 meter movement threshold
        },
        (loc: Location.LocationObject) => {
          const fix = this.sanitizeLocationObject(loc);
          if (fix && this.onFixCallback) {
            this.onFixCallback(fix);
          }
        }
      );

      this.isWatching = true;
      return true;
    } catch (e: any) {
      console.error('[LocationService] Error starting position watch:', e);
      if (this.onErrorCallback) {
        this.onErrorCallback(e?.message || 'FAILED TO INITIALIZE LOCATION');
      }
      return false;
    }
  }

  /**
   * Stop watching location and clear subscription handle cleanly
   */
  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isWatching = false;
    this.onFixCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Sanitize location objects to prevent NaN or corrupted values
   */
  private sanitizeLocationObject(loc: Location.LocationObject): LocationFix | null {
    if (!loc || !loc.coords) return null;

    const { latitude, longitude, altitude, accuracy, speed, heading } = loc.coords;

    // Validate coordinate bounds
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      return null;
    }

    return {
      timestamp: loc.timestamp || Date.now(),
      latitude,
      longitude,
      altitude: typeof altitude === 'number' && !isNaN(altitude) ? altitude : null,
      accuracy: typeof accuracy === 'number' && !isNaN(accuracy) && accuracy >= 0 ? accuracy : null,
      speed: typeof speed === 'number' && !isNaN(speed) && speed >= 0 ? speed : null, // m/s
      bearing: typeof heading === 'number' && !isNaN(heading) && heading >= 0 ? heading : null, // degrees
    };
  }
}

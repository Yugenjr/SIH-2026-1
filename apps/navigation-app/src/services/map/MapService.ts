import { MAP_STYLES, DEFAULT_CAMERA_POSE, MapCameraPose } from '../../components/map/mapConfig';

export type MapConnectivityState = 'ONLINE' | 'OFFLINE';

export class MapService {
  private connectivityState: MapConnectivityState = 'ONLINE';

  public getStyleUrl(isDark: boolean): string {
    return isDark ? MAP_STYLES.DARK : MAP_STYLES.LIGHT;
  }

  public getDefaultCamera(): MapCameraPose {
    return { ...DEFAULT_CAMERA_POSE };
  }

  public getConnectivityState(): MapConnectivityState {
    return this.connectivityState;
  }

  public setConnectivityState(state: MapConnectivityState) {
    this.connectivityState = state;
  }
}

export const mapService = new MapService();

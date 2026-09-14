import { NavigationState, TrajectoryPoint } from '../types/navigation';

export class DemoDataProvider {
  private state: NavigationState;
  private timer: any = null;
  private step: number = 0;
  private listeners: ((state: NavigationState) => void)[] = [];

  constructor() {
    this.state = {
      pose: {
        x: 0,
        y: 0,
        latitude: 12.9716,
        longitude: 77.5946,
        heading: 45,
        speed: 42.6,
      },
      positionUncertainty: 1.2,
      gnssStatus: 'AVAILABLE',
      navigationMode: 'GNSS + INS',
      imuStatus: 'ACTIVE',
      mapStatus: 'OFFLINE',
      isNavigating: false,
      demoStateIndex: 0,
      gnssTrajectory: [],
      idrTrajectory: [],
      mapMatchedTrajectory: [],
      activeBannerMessage: null,
    };

    this.initDemoTrajectories();
  }

  private initDemoTrajectories() {
    // Generate curved road demo path
    const points: TrajectoryPoint[] = [];
    const n = 120;
    let cx = 0;
    let cy = 0;
    let heading = 45;

    for (let i = 0; i < n; i++) {
      const turn = Math.sin(i / 15) * 2.5;
      heading = (heading + turn + 360) % 360;
      const rad = (heading * Math.PI) / 180;
      const dist = 3.5;
      cx += Math.sin(rad) * dist;
      cy += Math.cos(rad) * dist;

      points.push({
        x: cx,
        y: cy,
        latitude: 12.9716 + cy * 0.000009,
        longitude: 77.5946 + cx * 0.000009,
        type: 'gnss',
        timestamp: Date.now() + i * 100,
      });
    }

    this.state.gnssTrajectory = points.slice(0, 40);
    this.state.idrTrajectory = points.slice(0, 40);
    this.state.mapMatchedTrajectory = points.slice(0, 40);
  }

  public getState(): NavigationState {
    return { ...this.state };
  }

  public subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  public startNavigation() {
    if (this.state.isNavigating) return;
    this.state.isNavigating = true;
    this.step = 0;

    this.timer = setInterval(() => {
      this.tick();
    }, 100);

    this.notify();
  }

  public stopNavigation() {
    this.state.isNavigating = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  public setDemoState(index: number) {
    this.state.demoStateIndex = index;
    if (index === 0) {
      // GNSS AVAILABLE
      this.state.gnssStatus = 'AVAILABLE';
      this.state.navigationMode = 'GNSS + INS';
      this.state.positionUncertainty = 1.2;
      this.state.activeBannerMessage = null;
    } else if (index === 1) {
      // GNSS DENIED (IDR ACTIVE)
      this.state.gnssStatus = 'DENIED';
      this.state.navigationMode = 'IDR';
      this.state.positionUncertainty = 4.8;
      this.state.activeBannerMessage = 'GNSS SIGNAL LOST — DEAD RECKONING ACTIVE';
    } else if (index === 2) {
      // GNSS RECOVERING (FUSION)
      this.state.gnssStatus = 'RECOVERING';
      this.state.navigationMode = 'FUSION';
      this.state.positionUncertainty = 2.1;
      this.state.activeBannerMessage = 'GNSS SIGNAL RESTORED — FUSION RECOVERY';
    }
    this.notify();
  }

  public cycleDemoState() {
    const nextState = (this.state.demoStateIndex + 1) % 3;
    this.setDemoState(nextState);
  }

  public resetPosition() {
    this.step = 0;
    this.initDemoTrajectories();
    this.state.pose = {
      x: 0,
      y: 0,
      latitude: 12.9716,
      longitude: 77.5946,
      heading: 45,
      speed: 42.6,
    };
    this.notify();
  }

  private tick() {
    this.step++;
    const turnRate = Math.sin(this.step / 20) * 1.8;
    const newHeading = (this.state.pose.heading + turnRate + 360) % 360;
    const speed = 40.0 + Math.sin(this.step / 10) * 5.0; // km/h
    const speedMps = speed / 3.6;
    const dt = 0.1; // 100ms

    const rad = (newHeading * Math.PI) / 180;
    const dx = Math.sin(rad) * speedMps * dt;
    const dy = Math.cos(rad) * speedMps * dt;

    const newX = this.state.pose.x + dx;
    const newY = this.state.pose.y + dy;
    const newLat = 12.9716 + newY * 0.000009;
    const newLon = 77.5946 + newX * 0.000009;

    this.state.pose = {
      x: newX,
      y: newY,
      latitude: newLat,
      longitude: newLon,
      heading: newHeading,
      speed: Math.round(speed * 10) / 10,
    };

    const newPoint: TrajectoryPoint = {
      x: newX,
      y: newY,
      latitude: newLat,
      longitude: newLon,
      type: this.state.gnssStatus === 'DENIED' ? 'idr' : 'gnss',
      timestamp: Date.now(),
    };

    if (this.state.gnssStatus === 'AVAILABLE') {
      this.state.gnssTrajectory.push(newPoint);
      if (this.state.gnssTrajectory.length > 200) this.state.gnssTrajectory.shift();
    }

    this.state.idrTrajectory.push({ ...newPoint, type: 'idr' });
    if (this.state.idrTrajectory.length > 200) this.state.idrTrajectory.shift();

    this.state.mapMatchedTrajectory.push({ ...newPoint, type: 'map_matched' });
    if (this.state.mapMatchedTrajectory.length > 200) this.state.mapMatchedTrajectory.shift();

    this.notify();
  }
}

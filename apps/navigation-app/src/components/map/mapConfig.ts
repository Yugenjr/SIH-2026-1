export interface MapCameraPose {
  latitude: number;
  longitude: number;
  zoomLevel: number;
  heading: number;
  pitch: number;
}

export const DEFAULT_CAMERA_POSE: MapCameraPose = {
  latitude: 12.9716,
  longitude: 77.5946,
  zoomLevel: 15.5,
  heading: 127,
  pitch: 35,
};

export const MAP_STYLES = {
  LIGHT: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  DARK: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  FALLBACK_LIGHT: 'https://demotiles.maplibre.org/style.json',
};

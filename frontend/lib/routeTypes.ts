export interface Location { lat: number; lng: number }
export interface RoutePath { type: string; coordinates: [number, number][] }
export interface RouteInput {
  pickup: Location; dropoff: Location; stops: Location[];
  algorithm: string; optimizeFor: string; routingMode: 'road' | 'demo';
  asyncMode: boolean; detailedSteps: boolean; showAlgorithmComparison: boolean;
}
export interface MapProps {
  pickup: Location; dropoff: Location; stops: Location[];
  routePath?: RoutePath | null; livePosition?: Location | null; accuracy?: number;
  onPickupChange: (point: Location) => void;
  onDropoffChange: (point: Location) => void;
  onStopsChange: (points: Location[]) => void;
  activeField: 'pickup' | 'dropoff' | 'stop' | null;
  selectedStop?: number;
  readOnly?: boolean;
}
export const validLocation = (point: Location) => Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;

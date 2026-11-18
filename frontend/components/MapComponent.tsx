import dynamic from 'next/dynamic';
import type { MapProps } from '../lib/routeTypes';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center text-slate-400">Loading interactive map…</div>,
});
export default function MapComponent(props: MapProps) { return <LeafletMap {...props} />; }

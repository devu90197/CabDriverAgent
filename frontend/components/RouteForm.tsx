import { useEffect, useRef, useState } from 'react';
import { LocationSearch, MapComponent } from './index';
import { Location, RouteInput, RoutePath, validLocation } from '../lib/routeTypes';

interface Props {
  onSubmit: (data: RouteInput) => void; loading: boolean;
  routePath?: RoutePath | null; onInputsChange: () => void;
}
const inputClass = 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white';

export default function RouteForm({ onSubmit, loading, routePath, onInputsChange }: Props) {
  const [pickup, setPickup] = useState<Location>({ lat: 12.9716, lng: 77.5946 });
  const [dropoff, setDropoff] = useState<Location>({ lat: 12.9352, lng: 77.6245 });
  const [stops, setStops] = useState<Location[]>([]);
  const [algorithm, setAlgorithm] = useState('auto');
  const [optimizeFor, setOptimizeFor] = useState('distance');
  const [routingMode, setRoutingMode] = useState<'road' | 'demo'>('road');
  const [asyncMode, setAsyncMode] = useState(false);
  const [detailedSteps, setDetailedSteps] = useState(true);
  const [showAlgorithmComparison, setShowAlgorithmComparison] = useState(true);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | 'stop'>('pickup');
  const [selectedStop, setSelectedStop] = useState(0);
  const [livePosition, setLivePosition] = useState<Location | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [autoReroute, setAutoReroute] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [error, setError] = useState('');
  const watcher = useRef<number | null>(null);
  const locationGeneration = useRef(0);
  const latest = useRef({ pickup, dropoff, stops, algorithm, optimizeFor, routingMode, asyncMode, detailedSteps, showAlgorithmComparison, livePosition, loading, hasRoute: !!routePath, onSubmit, onInputsChange });
  latest.current = { pickup, dropoff, stops, algorithm, optimizeFor, routingMode, asyncMode, detailedSteps, showAlgorithmComparison, livePosition, loading, hasRoute: !!routePath, onSubmit, onInputsChange };
  useEffect(() => {
    if (!tracking || !autoReroute) return;
    const timer = setInterval(() => {
      const state = latest.current;
      const point = state.livePosition;
      if (!point || state.loading || !state.hasRoute || ![point, state.dropoff, ...state.stops].every(validLocation)) return;
      const movedMeters = Math.hypot(point.lat - state.pickup.lat, (point.lng - state.pickup.lng) * Math.cos(point.lat * Math.PI / 180)) * 111320;
      if (movedMeters < 50) return;
      if ([state.dropoff, ...state.stops].some(p => p.lat === point.lat && p.lng === point.lng)) return;
      setPickup(point);
      state.onInputsChange();
      state.onSubmit({ pickup: point, dropoff: state.dropoff, stops: state.stops, algorithm: state.algorithm, optimizeFor: state.optimizeFor, routingMode: state.routingMode, asyncMode: state.asyncMode, detailedSteps: state.detailedSteps, showAlgorithmComparison: state.showAlgorithmComparison });
    }, 30000);
    return () => clearInterval(timer);
  }, [tracking, autoReroute]);
  const stopTracking = () => {
    locationGeneration.current++;
    if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
    watcher.current = null; setTracking(false);
  };
  useEffect(() => () => { locationGeneration.current++; if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current); }, []);
  const locate = () => {
    if (tracking) { stopTracking(); setGpsStatus('Location tracking stopped.'); return; }
    if (!navigator.geolocation || !window.isSecureContext) { setGpsStatus('Location needs HTTPS or localhost and a browser with geolocation support.'); return; }
    const generation = ++locationGeneration.current;
    setTracking(true); setGpsStatus('Waiting for location permission and a position fix…');
    let firstFix = true;
    watcher.current = navigator.geolocation.watchPosition(position => {
      if (generation !== locationGeneration.current) return;
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      setLivePosition(point); setAccuracy(position.coords.accuracy);
      setGpsStatus(`Location updated ${new Date(position.timestamp).toLocaleTimeString()} · accuracy ±${Math.round(position.coords.accuracy)} m`);
      if (firstFix) { firstFix = false; setPickup(point); onInputsChange(); }
    }, err => {
      if (generation !== locationGeneration.current) return;
      if (err.code === 1) {
        setGpsStatus('Location permission denied. Allow it in browser settings, or use the map and coordinate fields.');
        stopTracking();
      } else {
        // Timeouts and temporary position loss do not revoke the ongoing watcher.
        setGpsStatus('Waiting for another location fix. Tracking remains active; check device location settings.');
      }
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  };
  const update = (setter: (p: Location) => void, point: Location) => { setter(point); onInputsChange(); };
  const updateStops = (points: Location[]) => { setStops(points); onInputsChange(); };
  const submit = () => {
    const points = [pickup, ...stops, dropoff];
    if (!points.every(validLocation)) { setError('Enter finite coordinates: latitude -90 to 90, longitude -180 to 180.'); return; }
    if (new Set(points.map(p => `${p.lat},${p.lng}`)).size !== points.length) { setError('Pickup, dropoff and stops must have distinct coordinates.'); return; }
    setError(''); onSubmit({ pickup, dropoff, stops, algorithm, optimizeFor, routingMode, asyncMode, detailedSteps, showAlgorithmComparison });
  };
  const coordinates = (point: Location, setter: (p: Location) => void, name: string, field: 'pickup' | 'dropoff' | 'stop', index = 0) => <div className="grid grid-cols-2 gap-3 mt-3">
    {(['lat', 'lng'] as const).map(axis => <label key={axis} className="text-sm text-slate-400">{axis === 'lat' ? 'Latitude' : 'Longitude'}
      <input aria-label={`${name} ${axis === 'lat' ? 'latitude' : 'longitude'}`} type="number" step="any" required min={axis === 'lat' ? -90 : -180} max={axis === 'lat' ? 90 : 180}
        value={Number.isFinite(point[axis]) ? point[axis] : ''} onFocus={() => { setActiveField(field); setSelectedStop(index); }}
        onChange={e => update(setter, { ...point, [axis]: e.target.value === '' ? NaN : Number(e.target.value) })} className={inputClass} />
    </label>)}
  </div>;
  return <div className="w-full max-w-4xl mx-auto"><form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-8">
    <div className="flex flex-wrap gap-3 items-center">
      <button type="button" onClick={locate} className="px-4 py-3 border border-blue-400 rounded-lg text-blue-200">{tracking ? 'Stop live location' : 'Use my live location'}</button>
      {livePosition && <button type="button" className="text-amber-300 underline" onClick={() => update(setPickup, livePosition)}>Set pickup to latest position</button>}
      <p className="text-sm text-slate-400" role="status">{gpsStatus || 'Choose pickup/dropoff by address, coordinates, or map. Location tracking is optional.'}</p>
      <label className="text-sm text-slate-300"><input type="checkbox" checked={autoReroute} onChange={e => setAutoReroute(e.target.checked)} /> Refresh route from live position (checks every 30 seconds after 50 m movement)</label>
    </div>
    {([{ point: pickup, setter: setPickup, name: 'Pickup', field: 'pickup' }, { point: dropoff, setter: setDropoff, name: 'Dropoff', field: 'dropoff' }] as const).map(({ point, setter, name, field }) => <section key={name}>
      <h2 className="text-lg font-semibold text-white mb-3">{name} location</h2>
      <LocationSearch placeholder={`Search ${name.toLowerCase()} address or landmark`} onSelect={p => update(setter, { lat: p.lat, lng: p.lng })} />
      {coordinates(point, setter, name, field)}
    </section>)}
    <section className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-lg text-white font-semibold">Intermediate stops ({stops.length}/10)</h2><button type="button" disabled={stops.length >= 10} onClick={() => updateStops([...stops, { lat: NaN, lng: NaN }])} className="text-amber-300 disabled:opacity-40">+ Add Stop</button></div>
      {stops.map((stop, i) => <div key={i} className="p-4 rounded-xl border border-slate-700 space-y-3">
        <h3 className="text-white">Stop {i + 1}</h3>
        <LocationSearch placeholder={`Search stop ${i + 1}`} onSelect={p => updateStops(stops.map((old, j) => i === j ? { lat: p.lat, lng: p.lng } : old))} />
        {coordinates(stop, p => setStops(stops.map((old, j) => i === j ? p : old)), `Stop ${i + 1}`, 'stop', i)}
        <button type="button" onClick={() => updateStops(stops.filter((_, j) => j !== i))} className="text-red-300">Remove Stop {i + 1}</button>
      </div>)}
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Interactive map</h2>
      <div className="flex flex-wrap gap-2" aria-label="Map selection">
        {(['pickup', 'dropoff'] as const).map(field => <button key={field} type="button" aria-pressed={activeField === field} onClick={() => setActiveField(field)} className={`px-3 py-2 rounded-lg border ${activeField === field ? 'border-amber-400 text-amber-300' : 'border-slate-600 text-slate-300'}`}>Set {field} on map</button>)}
        {stops.map((_, i) => <button type="button" key={i} onClick={() => { setActiveField('stop'); setSelectedStop(i); }} className={`px-3 py-2 rounded-lg border ${activeField === 'stop' && selectedStop === i ? 'border-amber-400 text-amber-300' : 'border-slate-600 text-slate-300'}`}>Set stop {i + 1} on map</button>)}
      </div>
      <p className="text-sm text-slate-400">Click the map to set {activeField === 'stop' ? `stop ${selectedStop + 1}` : activeField}, or drag a marker. Blue dot = live device position; amber line = calculated route.</p>
      <MapComponent pickup={pickup} dropoff={dropoff} stops={stops} routePath={routePath} onPickupChange={p => update(setPickup, p)} onDropoffChange={p => update(setDropoff, p)} onStopsChange={updateStops} activeField={activeField} selectedStop={selectedStop} livePosition={livePosition} accuracy={accuracy} />
    </section>
    <div className="grid md:grid-cols-3 gap-4 p-5 bg-slate-800/40 rounded-xl border border-slate-700">
      <label className="text-slate-300">Routing data<select aria-label="Routing data" className={inputClass} value={routingMode} onChange={e => { setRoutingMode(e.target.value as 'road' | 'demo'); onInputsChange(); }}><option value="road">Live road service</option><option value="demo">Local DSA demo (straight lines)</option></select></label>
      <label className="text-slate-300">Algorithm<select aria-label="Algorithm" className={inputClass} value={algorithm} onChange={e => { setAlgorithm(e.target.value); onInputsChange(); }}><option value="auto">Auto select</option><option value="dijkstra">Dijkstra</option><option value="astar">A*</option><option value="nn+2opt">Nearest Neighbor + 2-opt</option></select></label>
      <label className="text-slate-300">Optimize stop order for<select aria-label="Optimization objective" className={inputClass} value={optimizeFor} onChange={e => { setOptimizeFor(e.target.value); onInputsChange(); }}><option value="distance">Road-distance cost</option><option value="time">Driving-time cost</option></select></label>
    </div>
    <p className="text-sm text-slate-400">Dijkstra/A* keep stops in input order. Auto uses Nearest Neighbor + 2-opt when stops exist, with pickup and dropoff fixed. Road legs follow the provider driving profile; no live traffic or fare data is included. Local demo ETA assumes 30 km/h.</p>
    <div className="flex flex-wrap gap-5 text-slate-300">
      <label><input type="checkbox" checked={asyncMode} onChange={e => { setAsyncMode(e.target.checked); onInputsChange(); }} /> Background job with live progress</label>
      <label><input type="checkbox" checked={detailedSteps} onChange={e => { setDetailedSteps(e.target.checked); onInputsChange(); }} /> Detailed DSA steps</label>
      <label><input type="checkbox" checked={showAlgorithmComparison} onChange={e => { setShowAlgorithmComparison(e.target.checked); onInputsChange(); }} /> Compare Dijkstra and A*</label>
    </div>
    <p className="text-xs text-slate-500">Address search: Photon / OpenStreetMap. Searches and road coordinates are sent to the selected map providers. Device tracking stays in this browser until you set it as pickup and calculate.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <button type="submit" disabled={loading} className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl">{loading ? 'Calculating route…' : 'Calculate route'}</button>
  </form></div>;
}

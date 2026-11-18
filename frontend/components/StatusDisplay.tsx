import { useState } from 'react';
import AlgorithmSteps from './AlgorithmSteps';
import AlgorithmTreeVisualization from './AlgorithmTreeVisualization';
import MapComponent from './MapComponent';

interface AlgorithmStats { cost?: number; cost_unit?: string; nodes_explored?: number; execution_time_ms?: number }
interface Props {
  jobId: string | null; jobStatus: string | null; progress: number;
  error: string | null; route: any; dijkstraStats?: AlgorithmStats; astarStats?: AlgorithmStats; locations?: any[];
}
export default function StatusDisplay({ jobId, jobStatus, progress, error, route, dijkstraStats, astarStats, locations = [] }: Props) {
  const [tab, setTab] = useState('details');
  if (error) return <div role="alert" className="bg-red-950 border border-red-700 rounded-xl p-6 text-red-200"><h3 className="font-bold text-xl mb-2">Route unavailable</h3><p>{error}</p></div>;
  if (!route) return <div role="status" className="p-6 rounded-xl border border-slate-700 text-slate-300 space-y-4">
    <h3 className="font-bold text-xl text-white">{jobStatus === 'queued' ? 'Route queued' : 'Calculating route…'}</h3>
    {jobId && <p>Job {jobId} · {jobStatus}</p>}
    <progress aria-label="Route calculation progress" value={progress} max={100} className="w-full" />
    <p>Reading routing data and computing the requested path. Progress updates reflect completed stages.</p>
  </div>;
  const tabs = ['details', ...(route.steps?.length ? ['steps', 'visualization'] : []), ...(dijkstraStats && astarStats ? ['comparison'] : [])];
  return <div className="space-y-5 text-slate-200" data-testid="route-result">
    <div className="flex flex-wrap gap-3 border-b border-slate-700 pb-3">{tabs.map(name => <button key={name} type="button" onClick={() => setTab(name)} className={`px-4 py-2 rounded-lg capitalize ${name === tab ? 'bg-amber-500 text-slate-950' : 'bg-slate-800'}`}>{name === 'details' ? 'Route details' : name === 'steps' ? 'Algorithm steps' : name === 'comparison' ? 'Algorithm comparison' : 'Graph exploration'}</button>)}</div>
    <div className="rounded-lg p-4 border border-amber-500/40 bg-amber-500/10 text-sm"><strong>{route.source}</strong><p>{route.warning}</p></div>
    {tab === 'details' && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><p className="text-slate-400">Route distance</p><strong data-testid="route-distance">{route.distance_km.toFixed(2)} km</strong></div>
        <div><p className="text-slate-400">Estimated travel time</p><strong>{route.eta_min.toFixed(1)} min</strong></div>
        <div><p className="text-slate-400">Algorithm</p><strong>{route.algorithm}</strong></div>
        <div><p className="text-slate-400">Total request compute</p><strong>{route.execution_time_ms.toFixed(2)} ms</strong></div>
      </div>
      {locations.length >= 2 && <MapComponent pickup={locations[0]} dropoff={locations[locations.length - 1]} stops={locations.slice(1, -1)} routePath={route.route_geojson} readOnly activeField={null} onPickupChange={() => {}} onDropoffChange={() => {}} onStopsChange={() => {}} />}
      <p>Stop order: {(route.stop_order || []).map((i: number) => locations[i]?.name || `Node ${i}`).join(' → ')}</p>
      <p className="text-sm text-slate-400">Calculated {new Date(route.calculated_at).toLocaleString()} · A* heuristic: {route.heuristic}</p>
      {route.optimization && <p>Nearest Neighbor cost: {route.optimization.initial_cost.toFixed(3)} {route.optimization.cost_unit} → after 2-opt: {route.optimization.optimized_cost.toFixed(3)} {route.optimization.cost_unit}. Heuristic result; no global optimality guarantee.</p>}
      <button type="button" className="px-4 py-2 rounded-lg border border-slate-600" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(route, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cab-route.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Download route JSON</button>
    </>}
    {tab === 'steps' && <AlgorithmSteps steps={route.steps} algorithm={route.algorithm} />}
    {tab === 'visualization' && <AlgorithmTreeVisualization steps={route.steps} algorithm={route.algorithm} locations={locations} />}
    {tab === 'comparison' && <div className="space-y-4 overflow-auto">
      <h3 className="font-bold text-xl">Measured DSA comparison</h3>
      <table className="w-full text-left"><thead><tr>{['Algorithm', 'Waypoint cost', 'Nodes expanded (sum over legs)', 'Compute (ms)'].map(text => <th key={text} className="p-3 border-b border-slate-600">{text}</th>)}</tr></thead><tbody>
        {([['Dijkstra', dijkstraStats], ['A*', astarStats]] as const).map(([name, stats]) => <tr key={name}><td className="p-3">{name}</td><td className="p-3">{stats?.cost?.toFixed(4)} {stats?.cost_unit}</td><td className="p-3">{stats?.nodes_explored}</td><td className="p-3">{stats?.execution_time_ms?.toFixed(4)}</td></tr>)}
      </tbody></table>
      <p className="text-sm text-slate-400">Both run on the same waypoint graph and stop sequence. Times exclude provider requests and are single measurements. Live A* uses a zero lower bound, so it behaves like Dijkstra. Road geometry and displayed distance/ETA come from the final provider response.</p>
    </div>}
  </div>;
}

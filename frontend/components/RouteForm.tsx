import { useState } from 'react';
import { MapPin, Navigation, Brain } from 'lucide-react';
import { LocationSearch, MapComponent } from './index';

interface Location {
  lat: number;
  lng: number;
}

interface RouteFormProps {
  onSubmit: (data: {
    pickup: Location;
    dropoff: Location;
    stops: Location[];
    optimizeFor: string;
    algorithm: string;
    asyncMode: boolean;
    detailedSteps: boolean; // New property for step-by-step execution
    showAlgorithmComparison: boolean; // New property for algorithm comparison
  }) => void;
  loading: boolean;
}

export default function RouteForm({
  onSubmit,
  loading
}: RouteFormProps) {
  const [pickup, setPickup] = useState<Location>({ lat: 12.9716, lng: 77.5946 });
  const [dropoff, setDropoff] = useState<Location>({ lat: 12.9352, lng: 77.6245 });
  const [stops, setStops] = useState<Location[]>([]);
  const [algorithm, setAlgorithm] = useState<string>('auto');
  const [asyncMode, setAsyncMode] = useState<boolean>(false);
  const [detailedSteps, setDetailedSteps] = useState<boolean>(false);
  const [showAlgorithmComparison, setShowAlgorithmComparison] = useState<boolean>(false);
  const [optimizeFor, setOptimizeFor] = useState<string>('time');
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | 'stop' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      pickup,
      dropoff,
      stops,
      optimizeFor,
      algorithm,
      asyncMode,
      detailedSteps, // Pass detailedSteps to onSubmit
      showAlgorithmComparison, // Pass showAlgorithmComparison to onSubmit
    });
  };

  const addStop = () => {
    setStops([...stops, { lat: 12.95, lng: 77.6 }]);
  };

  const updateStop = (index: number, field: 'lat' | 'lng', value: number) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    const newStops = [...stops];
    newStops.splice(index, 1);
    setStops(newStops);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Pickup Location */}
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-gray-200">
            📍 Pickup Location
          </label>
          <LocationSearch
            placeholder="Enter pickup address or landmark"
            onSelect={(location) => setPickup({ lat: location.lat, lng: location.lng })}
            initialValue="Bangalore, India"
            textColor="text-white"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={pickup.lat}
                onChange={(e) => setPickup({ ...pickup, lat: parseFloat(e.target.value) })}
                placeholder="Enter latitude"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onFocus={() => setActiveField('pickup')}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={pickup.lng}
                onChange={(e) => setPickup({ ...pickup, lng: parseFloat(e.target.value) })}
                placeholder="Enter longitude"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onFocus={() => setActiveField('pickup')}
              />
            </div>
          </div>
        </div>

        {/* Dropoff Location */}
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-gray-200">
            🏁 Dropoff Location
          </label>
          <LocationSearch
            placeholder="Enter destination address or landmark"
            onSelect={(location) => setDropoff({ lat: location.lat, lng: location.lng })}
            initialValue="Koramangala, Bangalore, India"
            textColor="text-white"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={dropoff.lat}
                onChange={(e) => setDropoff({ ...dropoff, lat: parseFloat(e.target.value) })}
                placeholder="Enter latitude"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                onFocus={() => setActiveField('dropoff')}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={dropoff.lng}
                onChange={(e) => setDropoff({ ...dropoff, lng: parseFloat(e.target.value) })}
                placeholder="Enter longitude"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                onFocus={() => setActiveField('dropoff')}
              />
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-lg font-semibold text-gray-200">
              🚩 Intermediate Stops ({stops.length})
            </label>
            <button
              type="button"
              onClick={addStop}
              className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 rounded-lg hover:from-pink-500/30 hover:to-purple-500/30 transition-all border border-pink-500/30"
            >
              <span>+ Add Stop</span>
            </button>
          </div>

          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {stops.map((stop, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 card-glass">
                <LocationSearch
                  placeholder={`Enter stop ${idx + 1} address or landmark`}
                  onSelect={(location) => {
                    const newStops = [...stops];
                    newStops[idx] = { lat: location.lat, lng: location.lng };
                    setStops(newStops);
                  }}
                  textColor="text-white"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={stop.lat}
                      onChange={(e) => updateStop(idx, 'lat', parseFloat(e.target.value))}
                      placeholder="Enter latitude"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={stop.lng}
                      onChange={(e) => updateStop(idx, 'lng', parseFloat(e.target.value))}
                      placeholder="Enter longitude"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeStop(idx)}
                    className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/30"
                  >
                    Remove Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Map */}
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-gray-200">
            🗺️ Interactive Map
          </label>
          <p className="text-sm text-gray-400 mb-2">
            Click on the map to set pickup/dropoff locations. First click on a location field above, then click on the map.
          </p>
          <MapComponent
            pickup={pickup}
            dropoff={dropoff}
            stops={stops}
            onPickupChange={setPickup}
            onDropoffChange={setDropoff}
            onStopsChange={setStops}
            activeField={activeField}
            onStopSelect={(index) => {
              // Logic to handle stop selection would go here
            }}
          />
        </div>

        {/* Optimization Preference */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 card-glass">
          <h3 className="text-xl font-bold text-white mb-4">Optimization Preference</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/50 transition-all card-glass">
              <input
                type="radio"
                name="optimizeFor"
                value="time"
                checked={optimizeFor === 'time'}
                onChange={() => setOptimizeFor('time')}
                className="w-4 h-4 text-blue-500"
              />
              <div>
                <span className="block font-medium text-white">⏱️ Time</span>
                <span className="block text-xs text-gray-400">Fastest route</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/50 transition-all card-glass">
              <input
                type="radio"
                name="optimizeFor"
                value="distance"
                checked={optimizeFor === 'distance'}
                onChange={() => setOptimizeFor('distance')}
                className="w-4 h-4 text-blue-500"
              />
              <div>
                <span className="block font-medium text-white">📏 Distance</span>
                <span className="block text-xs text-gray-400">Shortest route</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/50 transition-all card-glass">
              <input
                type="radio"
                name="optimizeFor"
                value="fare"
                checked={optimizeFor === 'fare'}
                onChange={() => setOptimizeFor('fare')}
                className="w-4 h-4 text-blue-500"
              />
              <div>
                <span className="block font-medium text-white">💰 Fare</span>
                <span className="block text-xs text-gray-400">Most economical</span>
              </div>
            </label>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 card-glass">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-500" />
            Algorithm Selection
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800/50 transition-all card-glass">
              <input
                type="radio"
                name="algorithm"
                value="auto"
                checked={algorithm === 'auto'}
                onChange={() => setAlgorithm('auto')}
                className="w-5 h-5 text-blue-500"
              />
              <div>
                <span className="block font-medium text-white">🤖 Auto Select</span>
                <span className="block text-sm text-gray-400">Let system choose best algorithm</span>
              </div>
            </label>

            <label className="group relative flex flex-col gap-3 p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all card-glass overflow-hidden">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="algorithm"
                  value="dijkstra"
                  checked={algorithm === 'dijkstra'}
                  onChange={() => setAlgorithm('dijkstra')}
                  className="w-5 h-5 text-amber-500 accent-amber-500"
                />
                <div>
                  <span className="block font-bold text-white tracking-tight">Classic Dijkstra</span>
                  <span className="block text-xs text-slate-500 font-mono">O(E log V) Efficiency</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mt-2">
                <p className="text-[10px] text-slate-400 leading-tight">
                  Guarantees the shortest path by exploring all possible directions uniformly. Ideal for smaller search spaces where precision is paramount.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
            </label>

            <label className="group relative flex flex-col gap-3 p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all card-glass overflow-hidden">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="algorithm"
                  value="astar"
                  checked={algorithm === 'astar'}
                  onChange={() => setAlgorithm('astar')}
                  className="w-5 h-5 text-amber-500 accent-amber-500"
                />
                <div>
                  <span className="block font-bold text-white tracking-tight">A* Optimized Search</span>
                  <span className="block text-xs text-slate-500 font-mono">Heuristic Guided</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mt-2">
                <p className="text-[10px] text-slate-400 leading-tight">
                  Uses the Haversine formula as a heuristic to prune the search space, drastically reducing computation time while maintaining optimality.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/10 transition-colors"></div>
            </label>
          </div>
        </div>

        {/* Additional Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Async Mode */}
          <div className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 card-glass">
            <input
              type="checkbox"
              id="async-mode"
              checked={asyncMode}
              onChange={(e) => setAsyncMode(e.target.checked)}
              className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
            />
            <label htmlFor="async-mode" className="ml-3 text-gray-200 font-medium">
              🔄 Async Mode (Recommended for complex routes)
            </label>
          </div>

          {/* Detailed Steps */}
          <div className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 card-glass">
            <input
              type="checkbox"
              id="detailed-steps"
              checked={detailedSteps}
              onChange={(e) => setDetailedSteps(e.target.checked)}
              className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
            />
            <label htmlFor="detailed-steps" className="ml-3 text-gray-200 font-medium">
              📋 Show Detailed Steps (Step-by-step execution)
            </label>
          </div>

          {/* Algorithm Comparison */}
          <div className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 card-glass">
            <input
              type="checkbox"
              id="algorithm-comparison"
              checked={showAlgorithmComparison}
              onChange={(e) => setShowAlgorithmComparison(e.target.checked)}
              className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
            />
            <label htmlFor="algorithm-comparison" className="ml-3 text-gray-200 font-medium">
              🆚 Show Algorithm Comparison (Dijkstra vs A*)
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${loading
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
        >
          {loading ? (
            <>
              <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></span>
              Calculating Optimal Route...
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              Calculate Optimal Route
            </>
          )}
        </button>
      </form>
    </div>
  );
}
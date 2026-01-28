import { useState } from 'react';
import { Loader, CheckCircle, AlertTriangle, BarChart3, GitBranch, Eye } from 'lucide-react';
import AlgorithmSteps from './AlgorithmSteps';
import AlgorithmTreeVisualization from './AlgorithmTreeVisualization';

interface AlgorithmStats {
  steps_count?: number;
  distance_km?: number;
  execution_time_ms?: number;
}

interface StatusDisplayProps {
  jobId: string | null;
  jobStatus: string | null;
  progress: number;
  error: string | null;
  route: any;
  // Add algorithm stats props
  dijkstraStats?: AlgorithmStats;
  astarStats?: AlgorithmStats;
  locations?: any[];
}

export default function StatusDisplay({ 
  jobId, 
  jobStatus, 
  progress, 
  error, 
  route,
  dijkstraStats,
  astarStats,
  locations
}: StatusDisplayProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 card-glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Error</h3>
        </div>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (jobId && jobStatus) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 card-glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Loader className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white">Processing Route</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Job ID: {jobId}</span>
            <span className="text-gray-400 capitalize">{jobStatus}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-3 text-gray-400">
            {jobStatus === 'queued' 
              ? 'Your request is queued for processing...' 
              : 'Calculating optimal route...'}
          </p>
        </div>
      </div>
    );
  }

  if (route) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 card-glass">
        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-gray-700 mb-6">
          <button
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 'details'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Route Details
          </button>
          {route.steps && route.steps.length > 0 && (
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === 'steps'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('steps')}
            >
              Algorithm Steps
            </button>
          )}
          {route.algorithm && (
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('stats')}
            >
              Performance Stats
            </button>
          )}
          {route.steps && route.steps.length > 0 && locations && locations.length > 0 && (
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === 'visualization'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('visualization')}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Tree Visualization</span>
              </div>
            </button>
          )}
          {(dijkstraStats || astarStats) && (
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === 'comparison'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('comparison')}
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                <span>Algorithm Comparison</span>
              </div>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Route Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 p-5 rounded-xl border border-green-500/20 text-center card-glass">
                <p className="text-gray-300 text-sm mb-1">Distance</p>
                <p className="text-2xl font-bold text-green-300">{route.distance_km?.toFixed(2)} km</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5 rounded-xl border border-blue-500/20 text-center card-glass">
                <p className="text-gray-300 text-sm mb-1">Estimated Time</p>
                <p className="text-2xl font-bold text-blue-300">{route.eta_min?.toFixed(0)} min</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 rounded-xl border border-purple-500/20 text-center card-glass">
                <p className="text-gray-300 text-sm mb-1">Algorithm</p>
                <p className="text-2xl font-bold text-purple-300 capitalize">{route.algorithm}</p>
              </div>
            </div>

            {route.execution_time_ms && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-5 rounded-xl border border-yellow-500/20 text-center card-glass">
                <p className="text-gray-300 text-sm mb-1">Execution Time</p>
                <p className="text-2xl font-bold text-yellow-300">{route.execution_time_ms.toFixed(2)} ms</p>
              </div>
            )}

            {route.route_geojson && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-300 mb-3">Route Path</h4>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(route.route_geojson, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && route.steps && route.steps.length > 0 && (
          <AlgorithmSteps steps={route.steps} algorithm={route.algorithm || ''} />
        )}

        {activeTab === 'visualization' && route.steps && route.steps.length > 0 && locations && locations.length > 0 && (
          <AlgorithmTreeVisualization 
            steps={route.steps} 
            algorithm={route.algorithm || ''} 
            locations={locations} 
          />
        )}

        {activeTab === 'stats' && route.algorithm && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Algorithm Performance</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5 rounded-xl border border-blue-500/20 card-glass">
                <h4 className="font-bold text-blue-300 mb-3">Current Algorithm</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Name:</span>
                    <span className="font-medium text-white capitalize">{route.algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Distance:</span>
                    <span className="font-medium text-white">{route.distance_km?.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Time:</span>
                    <span className="font-medium text-white">{route.eta_min?.toFixed(0)} min</span>
                  </div>
                  {route.execution_time_ms && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Execution:</span>
                      <span className="font-medium text-white">{route.execution_time_ms.toFixed(2)} ms</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show comparison stats if available */}
              {dijkstraStats && astarStats && (
                <>
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-5 rounded-xl border border-green-500/20 card-glass">
                    <h4 className="font-bold text-green-300 mb-3">Dijkstra</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Distance:</span>
                        <span className="font-medium text-white">{dijkstraStats.distance_km?.toFixed(2)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Time:</span>
                        <span className="font-medium text-white">{((dijkstraStats.distance_km || 0) * 2).toFixed(0)} min</span>
                      </div>
                      {dijkstraStats.execution_time_ms && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Execution:</span>
                          <span className="font-medium text-white">{dijkstraStats.execution_time_ms.toFixed(2)} ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-5 rounded-xl border border-yellow-500/20 card-glass">
                    <h4 className="font-bold text-yellow-300 mb-3">A*</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Distance:</span>
                        <span className="font-medium text-white">{astarStats.distance_km?.toFixed(2)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Time:</span>
                        <span className="font-medium text-white">{((astarStats.distance_km || 0) * 2).toFixed(0)} min</span>
                      </div>
                      {astarStats.execution_time_ms && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Execution:</span>
                          <span className="font-medium text-white">{astarStats.execution_time_ms.toFixed(2)} ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Algorithm Comparison</h3>
            </div>
            
            {/* Algorithm Selection Checkboxes */}
            <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700 card-glass">
              <h4 className="text-lg font-bold text-white mb-4">Performance Metrics</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-300">Algorithm</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-300">Distance (km)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-300">Nodes Explored</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-300">Execution Time (ms)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-300">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dijkstraStats && (
                      <tr className="border-b border-gray-700/50">
                        <td className="py-3 px-4 text-white">Dijkstra</td>
                        <td className="py-3 px-4 text-white">{dijkstraStats.distance_km?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white">{dijkstraStats.steps_count}</td>
                        <td className="py-3 px-4 text-white">
                          {dijkstraStats.execution_time_ms !== undefined && dijkstraStats.execution_time_ms > 0
                            ? dijkstraStats.execution_time_ms.toFixed(2)
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-white">
                          {dijkstraStats.steps_count 
                            ? `${(100 - (dijkstraStats.steps_count / 100)).toFixed(1)}%` 
                            : 'N/A'}
                        </td>
                      </tr>
                    )}
                    {astarStats && (
                      <tr className="border-b border-gray-700/50">
                        <td className="py-3 px-4 text-white">A* Search</td>
                        <td className="py-3 px-4 text-white">{astarStats.distance_km?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white">{astarStats.steps_count}</td>
                        <td className="py-3 px-4 text-white">
                          {astarStats.execution_time_ms !== undefined && astarStats.execution_time_ms > 0
                            ? astarStats.execution_time_ms.toFixed(2)
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-white">
                          {astarStats.steps_count 
                            ? `${(100 - (astarStats.steps_count / 100)).toFixed(1)}%` 
                            : 'N/A'}
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* Algorithm Descriptions */}
            <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700 card-glass">
              <h4 className="text-lg font-bold text-white mb-4">Algorithm Characteristics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-blue-300 mb-2">Dijkstra-Based Algorithms</h5>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>Explores all directions equally without guidance</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>Guarantees optimal path when edge weights ≥ 0</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>More thorough but slower for large graphs</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-yellow-300 mb-2">A*-Based Algorithms</h5>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start">
                      <span className="text-yellow-400 mr-2">•</span>
                      <span>Uses heuristics to guide search toward goal</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-400 mr-2">•</span>
                      <span>More efficient for single-source, single-destination problems</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-400 mr-2">•</span>
                      <span>Performance depends on heuristic quality</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
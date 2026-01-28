import { useState } from 'react';

interface AlgorithmStep {
  step_number: number;
  current_node: number;
  visited_nodes: number[];
  frontier_nodes: [number, number][]; // [priority, node]
  distances: { [key: number]: number };
  previous_nodes: { [key: number]: number };
  description: string;
  timestamp: string;
}

interface AlgorithmStepsProps {
  steps: AlgorithmStep[];
  algorithm: string;
}

export default function AlgorithmSteps({ steps, algorithm }: AlgorithmStepsProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  if (!steps || steps.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Algorithm Execution</h3>
        <p className="text-gray-400">No detailed steps available for this algorithm.</p>
      </div>
    );
  }

  const toggleStep = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">
        {algorithm.toUpperCase()} Algorithm Execution Steps
        <span className="text-sm font-normal text-gray-400 ml-2">({steps.length} steps)</span>
      </h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {steps.map((step) => (
          <div 
            key={step.step_number} 
            className="border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-600"
          >
            <div 
              className="flex justify-between items-center p-3 bg-gray-800/70 cursor-pointer"
              onClick={() => toggleStep(step.step_number)}
            >
              <div className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold mr-3">
                  {step.step_number}
                </span>
                <span className="font-medium text-white">{step.description}</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedStep === step.step_number ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {expandedStep === step.step_number && (
              <div className="p-3 bg-gray-800/30 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Visited Nodes</h4>
                    <div className="flex flex-wrap gap-1">
                      {step.visited_nodes.map((node, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs"
                        >
                          Node {node}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Frontier Nodes</h4>
                    <div className="flex flex-wrap gap-1">
                      {step.frontier_nodes.map(([priority, node], idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs"
                        >
                          Node {node} ({priority.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Distances</h4>
                    <div className="text-xs text-gray-400">
                      {Object.entries(step.distances).map(([node, distance]) => (
                        <div key={node} className="mb-1">
                          <span className="text-blue-400">Node {node}:</span> {distance.toFixed(2)} km
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Previous Nodes</h4>
                    <div className="text-xs text-gray-400">
                      {Object.entries(step.previous_nodes).map(([node, prev]) => (
                        <div key={node} className="mb-1">
                          <span className="text-purple-400">Node {node}</span> ← Node {prev}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Timestamp: {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        <p>Click on any step to see detailed information about the algorithm's state at that point.</p>
      </div>
    </div>
  );
}
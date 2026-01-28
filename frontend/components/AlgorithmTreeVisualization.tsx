import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut, Move, RefreshCcw } from 'lucide-react';

interface AlgorithmStep {
  step_number: number;
  current_node: number;
  visited_nodes: number[];
  frontier_nodes: [number, number][];
  distances: { [key: number]: number };
  previous_nodes: { [key: number]: number };
  description: string;
  timestamp: string;
}

interface Node {
  id: number;
  x: number;
  y: number;
  visited: boolean;
  isCurrent: boolean;
  type: 'pickup' | 'drop' | 'intermediate';
  name: string;
}

interface AlgorithmTreeVisualizationProps {
  steps: AlgorithmStep[];
  algorithm: string;
  locations: Array<{ id: string; lat: number; lng: number; name?: string }>;
}

const AlgorithmTreeVisualization: React.FC<AlgorithmTreeVisualizationProps> = ({ 
  steps, 
  algorithm,
  locations 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Pan and Zoom State
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getLocationName = (nodeId: number): string => {
    if (nodeId < locations.length) {
      const location = locations[nodeId];
      return location.name || `Node ${nodeId}`;
    }
    return `Node ${nodeId}`;
  };

  const getNodeType = (nodeId: number): 'pickup' | 'drop' | 'intermediate' => {
    if (nodeId === 0) return 'pickup';
    if (nodeId === locations.length - 1) return 'drop';
    return 'intermediate';
  };

  // Build Tree Structure (Logic Preserved)
  const buildTreeStructure = () => {
    const nodeMap = new Map<number, Node>();
    const allNodeIds = new Set<number>();

    steps.forEach(step => {
      allNodeIds.add(step.current_node);
      step.visited_nodes.forEach(id => allNodeIds.add(id));
      step.frontier_nodes.forEach(([, id]) => allNodeIds.add(id));
    });

    const nodeIds = Array.from(allNodeIds).sort((a, b) => a - b);
    
    // Increased spacing for clearer view
    const levelWidth = 180; 
    const levelHeight = 140;

    nodeIds.forEach((id, index) => {
      const level = Math.floor(Math.log2(index + 1));
      const positionInLevel = index - (Math.pow(2, level) - 1);
      const levelSize = Math.pow(2, level);

      const x = (positionInLevel - (levelSize - 1) / 2) * levelWidth;
      const y = level * levelHeight;

      const visited = steps.some(s => s.visited_nodes.includes(id));
      const isCurrent = steps.some(s => s.current_node === id);

      nodeMap.set(id, {
        id,
        x,
        y,
        visited,
        isCurrent,
        type: getNodeType(id),
        name: getLocationName(id)
      });
    });

    const edges: Array<{ from: number; to: number; step: number }> = [];
    steps.forEach((step, stepIdx) => {
      Object.entries(step.previous_nodes).forEach(([target, source]) => {
        const sourceId = source;
        const targetId = parseInt(target);
        edges.push({ from: sourceId, to: targetId, step: stepIdx });
      });
    });

    return { nodes: Array.from(nodeMap.values()), edges };
  };

  const { nodes, edges } = buildTreeStructure();

  // Reset view when entering fullscreen or changing algorithm
  useEffect(() => {
    centerView();
  }, [isFullscreen, algorithm, steps]);

  const centerView = () => {
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Calculate bounds of nodes
        if(nodes.length > 0) {
            const minX = Math.min(...nodes.map(n => n.x));
            const maxX = Math.max(...nodes.map(n => n.x));
            const minY = Math.min(...nodes.map(n => n.y));
            
            // Center the graph logic
            const graphCenterX = (minX + maxX) / 2;
            const graphCenterY = minY + 100; // Offset slightly down

            setViewState({
                x: (width / 2) - graphCenterX,
                y: 100, // Top padding
                zoom: 0.8
            });
        }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationProgress(prev => (prev + 1) % 100);
    }, 40); // Slightly faster for smoother motion
    return () => clearInterval(interval);
  }, []);

  // --- Input Handlers for Pan/Zoom ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setViewState(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 0.1;
    const newZoom = viewState.zoom - Math.sign(e.deltaY) * scaleFactor;
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.2, Math.min(3, newZoom))
    }));
  };

  // --- Render Helpers ---

  const renderDefinitions = () => (
    <defs>
      {/* Glossy Gradient for Pickup */}
      <radialGradient id="grad-pickup" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </radialGradient>
      
      {/* Glossy Gradient for Drop */}
      <radialGradient id="grad-drop" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </radialGradient>

      {/* Glossy Gradient for Normal */}
      <radialGradient id="grad-normal" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </radialGradient>

      {/* Glossy Gradient for Active/Current */}
      <radialGradient id="grad-active" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>

      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="#475569" />
      </marker>
      <marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8" fill="#fbbf24" />
      </marker>

      {/* Glow Filter */}
      <filter id="glow-effect" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const renderEdges = () => {
    return edges.map((edge, idx) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (!fromNode || !toNode) return null;

      const isCurrentEdge = steps[currentStep]?.previous_nodes[toNode.id] === fromNode.id;
      
      // Interpolation for animation
      const progress = animationProgress / 100;
      const currentX = fromNode.x + (toNode.x - fromNode.x) * progress;
      const currentY = (fromNode.y + 35) + ((toNode.y - 35) - (fromNode.y + 35)) * progress;

      return (
        <g key={`edge-${idx}`}>
          {/* Base Line */}
          <line
            x1={fromNode.x}
            y1={fromNode.y + 35}
            x2={toNode.x}
            y2={toNode.y - 35}
            stroke={isCurrentEdge ? '#fbbf24' : '#475569'}
            strokeWidth={isCurrentEdge ? 3 : 1.5}
            markerEnd={isCurrentEdge ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
            opacity={isCurrentEdge ? 1 : 0.4}
            className="transition-colors duration-300"
          />

          {/* Moving Address Packet */}
          {isCurrentEdge && (
            <g transform={`translate(${currentX}, ${currentY})`}>
                {/* Glow behind packet */}
                <circle r="8" fill="#fbbf24" opacity="0.3" filter="url(#glow-effect)" />
                
                {/* The Packet Body (Transparent Glass) */}
                <rect 
                    x="-18" 
                    y="-10" 
                    width="36" 
                    height="20" 
                    rx="4" 
                    fill="rgba(255,255,255,0.1)" 
                    stroke="#fbbf24" 
                    strokeWidth="1"
                />
                
                {/* The Address/Data being passed */}
                <text 
                    x="0" 
                    y="4" 
                    textAnchor="middle" 
                    fontSize="10" 
                    fill="#fbbf24" 
                    fontWeight="bold"
                    style={{ textShadow: '0px 1px 2px rgba(0,0,0,1)' }}
                >
                    @{toNode.id}
                </text>
            </g>
          )}
        </g>
      );
    });
  };

  const renderNodes = () => {
    return nodes.map(node => {
      const isCurrent = steps[currentStep]?.current_node === node.id;
      
      let fillId = 'grad-normal';
      if (isCurrent) fillId = 'grad-active';
      else if (node.type === 'pickup') fillId = 'grad-pickup';
      else if (node.type === 'drop') fillId = 'grad-drop';

      return (
        <g 
            key={`node-${node.id}`} 
            style={{ 
                transform: `translate(${node.x}px, ${node.y}px)`,
                transition: 'transform 0.5s ease'
            }}
        >
          {/* Ripple Effect for Current Node */}
          {isCurrent && (
            <circle
              r="40"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              className="animate-ping opacity-75"
            />
          )}

          {/* Main Node Body (Glass sphere look) */}
          <circle
            r="30"
            fill={`url(#${fillId})`}
            stroke={isCurrent ? '#fff' : 'rgba(255,255,255,0.1)'}
            strokeWidth={isCurrent ? 3 : 1}
            filter={isCurrent ? 'url(#glow-effect)' : ''}
            style={{
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.5))'
            }}
          />

          {/* Node ID */}
          <text
            y="-5"
            textAnchor="middle"
            className="font-bold text-lg font-mono"
            fill="white"
            style={{ textShadow: '0px 2px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' }}
          >
            {node.id}
          </text>

          {/* Location Name */}
          <text
            y="12"
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.9)"
            style={{ pointerEvents: 'none' }}
          >
            {node.name.substring(0, 10)}
            {node.name.length > 10 ? '..' : ''}
          </text>

          {/* Type Badge */}
          <rect x="-24" y="36" width="48" height="16" rx="8" fill="#1e293b" stroke="#334155" />
          <text
            y="47"
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill={node.type === 'pickup' ? '#34d399' : node.type === 'drop' ? '#f87171' : '#94a3b8'}
            style={{ textTransform: 'uppercase' }}
          >
            {node.type}
          </text>

          {/* Visited Checkmark */}
          {node.visited && !isCurrent && (
            <circle
              cx="22"
              cy="-22"
              r="8"
              fill="#10b981"
              stroke="#064e3b"
              strokeWidth="2"
            />
          )}
        </g>
      );
    });
  };

  const TreeVisualization = () => (
    <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden bg-slate-900 relative cursor-move select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
        {/* Technical Grid Background */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
                backgroundImage: `
                    linear-gradient(to right, #334155 1px, transparent 1px),
                    linear-gradient(to bottom, #334155 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                transform: `translate(${viewState.x % 40}px, ${viewState.y % 40}px)`
            }}
        />

        <svg width="100%" height="100%">
            {renderDefinitions()}
            <g transform={`translate(${viewState.x},${viewState.y}) scale(${viewState.zoom})`}>
                {renderEdges()}
                {renderNodes()}
            </g>
        </svg>

        {/* View Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-slate-800/80 p-2 rounded-lg backdrop-blur border border-slate-700">
            <button onClick={() => setViewState(p => ({...p, zoom: p.zoom + 0.1}))} className="p-2 hover:bg-slate-700 rounded text-white">
                <ZoomIn size={20} />
            </button>
            <button onClick={() => setViewState(p => ({...p, zoom: p.zoom - 0.1}))} className="p-2 hover:bg-slate-700 rounded text-white">
                <ZoomOut size={20} />
            </button>
            <button onClick={centerView} className="p-2 hover:bg-slate-700 rounded text-white" title="Reset View">
                <RefreshCcw size={18} />
            </button>
        </div>
        
        {/* Help Text */}
        <div className="absolute top-4 left-4 pointer-events-none opacity-50 text-white text-xs flex items-center gap-2">
            <Move size={14} /> Drag to Pan • Scroll to Zoom
        </div>
    </div>
  );

  return (
    <>
      {/* --- NORMAL VIEW --- */}
      <div className={`bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col ${isFullscreen ? 'opacity-0 pointer-events-none fixed' : 'relative'}`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  {algorithm.toUpperCase()} Tree Visualization
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                    Interactive Binary Layout • Step {currentStep + 1} of {steps.length}
                </p>
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white border border-transparent hover:border-slate-700"
              title="Enter Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          <div style={{ height: '500px' }} className="relative bg-slate-950">
            <TreeVisualization />
          </div>

          {/* Controls Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
             <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition disabled:opacity-50 font-medium text-sm border border-slate-700"
                >
                    Previous
                </button>
                
                <div className="flex-1 flex flex-col gap-1">
                    <input
                        type="range"
                        min="0"
                        max={steps.length - 1}
                        value={currentStep}
                        onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                        className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Start</span>
                        <span>{currentStep + 1} / {steps.length}</span>
                        <span>End</span>
                    </div>
                </div>

                <button
                    onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                    disabled={currentStep === steps.length - 1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 font-medium text-sm shadow-lg shadow-blue-900/20"
                >
                    Next Step
                </button>
             </div>

             {/* Step Info */}
             {steps[currentStep] && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Current Operation</span>
                        <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                            {steps[currentStep].description}
                        </p>
                    </div>
                </div>
             )}
          </div>
      </div>
      
      {/* --- FULLSCREEN OVERLAY --- */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-200">
          <div className="bg-slate-900 border-b border-slate-800 p-4 px-6 flex items-center justify-between shadow-xl z-10">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {algorithm.toUpperCase()} Visualization
              </h2>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 Live Simulation Mode
              </p>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="px-4 py-2 bg-slate-800 rounded-full text-slate-300 text-sm font-mono border border-slate-700">
                    Step {currentStep + 1}/{steps.length}
                 </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition border border-transparent hover:border-red-500/30"
                >
                  <X className="w-6 h-6" />
                </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
             <TreeVisualization />
          </div>

          {/* Floating Controls in Fullscreen */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-6 min-w-[600px] max-w-[90vw]">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition font-semibold disabled:opacity-50 border border-slate-600"
              >
                Prev
              </button>

              <div className="flex-1">
                 <input
                    type="range"
                    min="0"
                    max={steps.length - 1}
                    value={currentStep}
                    onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                 />
                 <div className="text-center text-slate-400 text-xs mt-2 font-mono">
                    {steps[currentStep]?.description.substring(0, 60)}...
                 </div>
              </div>

              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-semibold disabled:opacity-50 shadow-lg shadow-blue-500/25"
              >
                Next
              </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AlgorithmTreeVisualization;
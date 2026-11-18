import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { api, errorMessage } from '../lib/api';
import type { RouteInput } from '../lib/routeTypes';
import { RouteForm, StatusDisplay, StatsCard, Header, EngineeringInsights } from '../components';

// --- VISUAL COMPONENTS (Updated for Absolute Sharpness) ---

// 1. Simplified Card Component (Flat and Static - No 3D Effects)
const FlatCard = ({ children, className = "", active = false }: { children: React.ReactNode, className?: string, active?: boolean }) => {
  return (
    <div
      className={`
        relative bg-slate-900 border 
        ${active ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'border-slate-700'} 
        rounded-xl p-1 transition-all duration-300 overflow-hidden
        ${className}
      `}
    >
      {/* Breathing Light Effect (Golden Glow) - Kept subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-600/5 to-transparent animate-pulse-slow pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 h-full p-6 md:p-8">
        {children}
      </div>
    </div>
  );
};

// 2. Background Grid (Clean, dark tech background)
const TechBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#020617]">
    {/* Animated Glowing Orbs */}
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse-slow shadow-[0_0_100px_rgba(245,158,11,0.2)]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s] shadow-[0_0_120px_rgba(59,130,246,0.15)]"></div>

    {/* Grid Floor */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] transform perspective-500 rotate-x-60" />

    {/* Vignette */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
  </div>
);

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCard] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('Checking routing API');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const dijkstraStats = route?.dijkstra_stats;
  const astarStats = route?.astar_stats;
  const locations = route?.locations || [];
  const lastCalculatedDistance = route ? { distance: route.distance_km, algorithm: route.algorithm } : null;

  useEffect(() => {
    const health = new AbortController();
    api.get('/health', { signal: health.signal }).then(() => setApiStatus('Routing API connected')).catch(() => { if (!health.signal.aborted) setApiStatus('Routing API unavailable'); });
    return () => { health.abort(); controller.current?.abort(); generation.current++; };
  }, []);

  const invalidateRoute = () => {
    generation.current++;
    controller.current?.abort();
    setLoading(false); setRoute(null); setJobId(null); setJobStatus(null); setProgress(0); setError(null); setPanelOpen(false);
  };

  const handleSubmit = async (data: RouteInput) => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const version = ++generation.current;
    setLoading(true); setError(null); setJobId(null); setJobStatus(null); setRoute(null); setProgress(0); setPanelOpen(true);
    try {
      const response = await api.post('/routes/estimate', {
        pickup: data.pickup, dropoff: data.dropoff, stops: data.stops,
        optimize_for: data.optimizeFor, algorithm: data.algorithm, routing_mode: data.routingMode,
        async_mode: data.asyncMode, detailed_steps: data.detailedSteps, show_algorithm_comparison: data.showAlgorithmComparison,
      }, { signal: request.signal });
      if (version !== generation.current) return;
      if (response.data.status === 'queued') {
        const id = response.data.job_id;
        setJobId(id); setJobStatus('queued');
        const deadline = Date.now() + 120000;
        while (!request.signal.aborted && Date.now() < deadline) {
          const statusResponse = await api.get(`/jobs/${id}`, { signal: request.signal });
          if (version !== generation.current) return;
          const status = statusResponse.data;
          setJobStatus(status.status); setProgress(status.progress);
          if (status.status === 'failed') throw new Error(status.error || 'Route computation failed. Please retry.');
          if (status.status === 'completed') {
            const result = await api.get(`/jobs/${id}/result`, { signal: request.signal });
            if (version === generation.current) { setRoute(result.data.result); setJobStatus('completed'); }
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (!request.signal.aborted) throw new Error('The job timed out. Please calculate again.');
      } else {
        setRoute(response.data); setJobStatus('completed'); setProgress(100);
      }
    } catch (err) {
      if (!request.signal.aborted && version === generation.current) setError(errorMessage(err));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-200 selection:bg-amber-500/30 selection:text-amber-200">
      <Head>
        <title>Cab Route Optimizer | Intelligent Transit</title>
        <meta name="description" content="Intelligent pathfinding powered by advanced algorithms" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(500px); opacity: 0; }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.05; }
            50% { opacity: 0.15; }
          }
          .animate-scan {
            animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          /* Utility to force sharp text */
          .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #0f172a; 
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569; 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d97706; 
          }
        `}</style>
      </Head>

      <TechBackground />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-4 md:p-8 flex flex-col items-center">

        {/* Header Section */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-7xl mx-auto mb-8"
        >
          <div className="border-b border-amber-500/20 pb-4 mb-4 flex justify-between items-end">
            <div>
              <Header />
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></span>
                <span className="text-xs font-mono text-amber-500 tracking-widest uppercase">{apiStatus}</span>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-[10px] text-slate-500 font-mono">SYS.VER.2.0.0</div>
              <div className="text-[10px] text-slate-500 font-mono">WAYPOINT_GRAPH_ENGINE</div>
            </div>
          </div>
        </motion.div>

        {/* Route Form - Flat Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-7xl mx-auto mb-12"
        >
          <FlatCard className="w-full">
            <div className="absolute top-0 right-0 p-2 flex gap-1">
              <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
            </div>
            <RouteForm
              onSubmit={handleSubmit}
              loading={loading}
              routePath={route?.route_geojson}
              onInputsChange={invalidateRoute}
            />
          </FlatCard>
        </motion.div>

        {route && <button type="button" onClick={() => setPanelOpen(true)} className="mb-6 px-5 py-3 rounded-lg border border-amber-500 text-amber-300">View route analysis</button>}

        {/* Stats Container */}
        <div className="w-full max-w-7xl mx-auto mb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 block rounded-sm"></span>
              Route metrics
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              {
                title: "Est. Distance",
                value: lastCalculatedDistance?.distance ? `${lastCalculatedDistance.distance.toFixed(2)} km` : "",
                desc: lastCalculatedDistance?.algorithm ? `${lastCalculatedDistance.algorithm.replace(/_/g, ' ')} route` : "Optimal Path",
                icon: "route" as 'route'
              },
              { title: "Estimated travel time", value: route ? `${route.eta_min.toFixed(1)} min` : "--", desc: "Driving profile estimate; excludes live traffic", icon: "clock" as 'clock' },
              { title: "Calculation time", value: route ? `${route.execution_time_ms.toFixed(1)} ms` : "--", desc: route?.source || "Awaiting calculation", icon: "zap" as 'zap' }
            ]).map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
              >
                <FlatCard
                  active={activeCard === index}
                  className="h-full"
                >
                  <div className="h-full">
                    <StatsCard
                      title={stat.title}
                      value={stat.value}
                      description={stat.desc}
                      icon={stat.icon}
                      index={index}
                    />
                  </div>
                </FlatCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Engineering Insights Section */}
        <EngineeringInsights />
      </div>

      {/* Result Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: panelOpen && (loading || jobId || error || route) ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className={`fixed bottom-0 left-0 right-0 z-50 h-[85vh] ${panelOpen ? "" : "invisible pointer-events-none"}`}
        role="dialog" aria-label="Route analysis" aria-hidden={!panelOpen}
      >
        <div className="absolute -top-10 left-0 w-full flex justify-center">
          <button
            onClick={() => setPanelOpen(false)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-2 rounded-t-lg font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-colors flex items-center gap-2"
          >
            <span>CLOSE PANEL</span>
          </button>
        </div>

        <div className="h-full w-full bg-slate-900 border-t-2 border-amber-500 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto h-full flex flex-col p-6">

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 bg-amber-500 animate-pulse rounded-full"></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Route Analysis</h3>
                  <p className="text-xs text-slate-400 font-mono">CALCULATION ID: #{jobId || 'SYNC_REQ'}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
              <StatusDisplay
                key={route?.calculated_at || jobId || "pending"}
                jobId={jobId}
                jobStatus={jobStatus}
                progress={progress}
                error={error}
                route={route}
                dijkstraStats={dijkstraStats}
                astarStats={astarStats}
                locations={locations}
              />
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
import { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from 'axios';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { saveRouteCalculation, subscribeToRouteUpdates } from '../lib/supabaseUtils';
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

interface Location {
  lat: number;
  lng: number;
}

interface FormData {
  pickup: Location;
  dropoff: Location;
  stops: Location[];
  optimizeFor: string;
  algorithm: string;
  asyncMode: boolean;
  detailedSteps: boolean;
  showAlgorithmComparison: boolean;
}

interface RouteAlgorithmStats {
  steps_count?: number;
  distance_km?: number;
  execution_time_ms?: number;
}

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [lastCalculatedDistance, setLastCalculatedDistance] = useState<{ distance: number, algorithm: string } | null>(null);

  // Algorithm stats state (keeping only Dijkstra and A*)
  const [dijkstraStats, setDijkstraStats] = useState<RouteAlgorithmStats | undefined>(undefined);
  const [astarStats, setAstarStats] = useState<RouteAlgorithmStats | undefined>(undefined);
  const [locations, setLocations] = useState<any[]>([]);

  // Subscribe to real-time route updates
  useEffect(() => {
    const sub = subscribeToRouteUpdates((payload) => {
      console.log('New route calculation:', payload);
    });

    setSubscription(sub);

    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, []);

  const handleSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setRoute(null);
    setDijkstraStats(undefined);
    setAstarStats(undefined);
    setLocations([]);

    try {
      const requestBody = {
        user_id: 'u_123',
        pickup: data.pickup,
        dropoff: data.dropoff,
        stops: data.stops,
        optimize_for: data.optimizeFor,
        algorithm: data.algorithm,
        async_mode: data.asyncMode,
        detailed_steps: data.detailedSteps,
        show_algorithm_comparison: data.showAlgorithmComparison,
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
      const response = await axios.post(`${backendUrl}/api/v1/routes/estimate`, requestBody);

      if (response.data.status === 'queued') {
        const jobId = response.data.job_id;
        setJobId(jobId);
        setJobStatus('queued');
        pollJobStatus(jobId);
      } else {
        setRoute(response.data);

        if (response.data.distance_km && response.data.algorithm) {
          setLastCalculatedDistance({
            distance: response.data.distance_km,
            algorithm: response.data.algorithm
          });
        }

        // Set algorithm stats (only Dijkstra and A*)
        if (response.data.dijkstra_stats) setDijkstraStats(response.data.dijkstra_stats);
        if (response.data.astar_stats) setAstarStats(response.data.astar_stats);
        if (response.data.locations) setLocations(response.data.locations);

        const routeData = {
          user_id: 'u_123',
          pickup: data.pickup,
          dropoff: data.dropoff,
          stops: data.stops,
          result: response.data,
          algorithm: data.algorithm
        };
        await saveRouteCalculation(routeData);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
        const statusResponse = await axios.get(`${backendUrl}/api/v1/jobs/${jobId}`);
        const { status, progress } = statusResponse.data;

        setJobStatus(status);
        setProgress(progress);

        if (status === 'completed') {
          clearInterval(pollInterval);
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
          const resultResponse = await axios.get(`${backendUrl}/api/v1/jobs/${jobId}/result`);
          setRoute(resultResponse.data.result);

          if (resultResponse.data.result?.distance_km && resultResponse.data.result?.algorithm) {
            setLastCalculatedDistance({
              distance: resultResponse.data.result.distance_km,
              algorithm: resultResponse.data.result.algorithm
            });
          }

          // Set algorithm stats (only Dijkstra and A*)
          if (resultResponse.data.result?.dijkstra_stats) setDijkstraStats(resultResponse.data.result.dijkstra_stats);
          if (resultResponse.data.result?.astar_stats) setAstarStats(resultResponse.data.result.astar_stats);
          if (resultResponse.data.result?.locations) setLocations(resultResponse.data.result.locations);

          const routeData = {
            user_id: 'u_123',
            pickup: resultResponse.data.result?.pickup || { lat: 12.9716, lng: 77.5946 },
            dropoff: resultResponse.data.result?.dropoff || { lat: 12.9352, lng: 77.6245 },
            stops: resultResponse.data.result?.stops || [],
            result: resultResponse.data.result,
            algorithm: resultResponse.data.result?.algorithm || 'auto'
          };
          await saveRouteCalculation(routeData);
        } else if (status === 'failed') {
          clearInterval(pollInterval);
          setError('Job failed to complete');
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        setError('Failed to fetch job status');
      }
    }, 2000);
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
                <span className="text-xs font-mono text-amber-500 tracking-widest uppercase">Traffic Control: Online</span>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-[10px] text-slate-500 font-mono">SYS.VER.2.0.4</div>
              <div className="text-[10px] text-slate-500 font-mono">CAB_FLEET_SYNC</div>
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
            />
          </FlatCard>
        </motion.div>

        {/* Stats Container */}
        <div className="w-full max-w-7xl mx-auto mb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 block rounded-sm"></span>
              Fleet Metrics
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
              { title: "Fuel Saved", value: "1.2 L", desc: "Efficiency Gain", icon: "zap" as 'zap' },
              { title: "Fleet Rating", value: "4.9", desc: "Customer Score", icon: "smile" as 'smile' }
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
        animate={{ y: (jobId || error || route) ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className="fixed bottom-0 left-0 right-0 z-50 h-[85vh]"
      >
        <div className="absolute -top-10 left-0 w-full flex justify-center">
          <button
            onClick={() => { setRoute(null); setJobId(null); setError(null); }}
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
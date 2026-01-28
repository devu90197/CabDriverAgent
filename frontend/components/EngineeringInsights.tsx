import { motion } from 'framer-motion';
import { Cpu, Network, Zap, Shield, Database, Activity } from 'lucide-react';

const InsightCard = ({ title, icon: Icon, description, tech }: { title: string, icon: any, description: string, tech: string[] }) => (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl hover:border-amber-500/50 transition-all duration-500 group">
        <div className="h-12 w-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-light">
            {description}
        </p>
        <div className="flex flex-wrap gap-2">
            {tech.map((t) => (
                <span key={t} className="text-[10px] font-mono text-slate-500 border border-slate-800 px-2 py-0.5 rounded">
                    {t}
                </span>
            ))}
        </div>
    </div>
);

export default function EngineeringInsights() {
    const insights = [
        {
            title: "Asynchronous Task Delegation",
            icon: Network,
            description: "Complex route optimizations exceeding threshold limits are automatically offloaded to a background worker cluster, preventing main thread blocking and ensuring high API availability.",
            tech: ["FastAPI", "Celery", "Redis"]
        },
        {
            title: "Multi-Heuristic Pathfinding",
            icon: Cpu,
            description: "The engine dynamically selects between Dijkstra and A* based on the search space size and available heuristics, optimizing for both speed and path optimality.",
            tech: ["Algorithm Selection", "A*", "Dijkstra"]
        },
        {
            title: "TSP Local Search Refinement",
            icon: Zap,
            description: "Implemented Nearest Neighbor initialization followed by 2-opt local search to solve the Traveling Salesman Problem, delivering high-quality approximations for multi-stop delivery routes.",
            tech: ["2-opt", "Heuristics", "Optimization"]
        },
        {
            title: "Real-time Data Resilience",
            icon: Database,
            description: "Leveraging Supabase's real-time engine and PostgreSQL, the system provides instant job tracking and persistent log event streaming for every route calculation.",
            tech: ["PostgreSQL", "Real-time", "Supabase"]
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto py-24 border-t border-slate-800/50">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">System Architecture</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        PRO-GRADE <span className="text-slate-500">ENGINEERING</span>
                    </h2>
                    <p className="mt-4 text-slate-400 font-light leading-relaxed">
                        Designed for scale and reliability, this platform demonstrates the integration of modern cloud-native patterns and classical algorithmic optimization.
                    </p>
                </div>
                <div className="flex items-center gap-4 text-slate-500 font-mono text-xs">
                    <div className="flex flex-col items-end">
                        <span>UPTIME: 99.9%</span>
                        <span>LATENCY: &lt;50MS</span>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-800"></div>
                    <div className="flex flex-col items-end">
                        <span>WORKERS: ACTIVE</span>
                        <span>NODES: 1,240</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {insights.map((insight, idx) => (
                    <motion.div
                        key={insight.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <InsightCard {...insight} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

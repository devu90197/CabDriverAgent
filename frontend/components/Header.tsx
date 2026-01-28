import { motion } from 'framer-motion';

export default function Header() {
  return (
    <div className="relative mb-12 text-left">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="h-[2px] w-12 bg-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
          <span className="text-[10px] font-mono text-amber-500 tracking-[0.3em] uppercase">Logistics Intelligence v2.0</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter">
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
            CAB DRIVER
          </span>
          <br />
          <span className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            AGENT
          </span>
        </h1>

        <p className="text-slate-400 max-w-xl text-lg font-light leading-relaxed mb-8">
          A high-performance route estimation engine leveraging <span className="text-slate-200 font-medium">distributed task queues</span> and <span className="text-slate-200 font-medium">multi-heuristic algorithms</span> to solve complex logistics at scale.
        </p>

        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-sm backdrop-blur-md">FastAPI Backend</span>
          <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-sm backdrop-blur-md">Celery Workers</span>
          <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 rounded-sm backdrop-blur-md">Redis Broker</span>
          <span className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-sm backdrop-blur-md">Supabase DB</span>
        </div>
      </motion.div>
      
      {/* Decorative vertical line */}
      <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-amber-500/30 to-transparent hidden xl:block"></div>
    </div>
  );
}
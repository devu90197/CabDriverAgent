import { useRef } from 'react';

export default function Header() {
  const headerRef = useRef<HTMLHeadingElement>(null);

  return (
    <div className="mb-10 text-center fade-in">
      <h1 
        ref={headerRef}
        className="heading-main font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight slide-in-left"
      >
        Route Optimizer
      </h1>
      <p className="heading-sub text-gray-300 max-w-3xl mx-auto mb-8 font-light slide-in-right delay-1">
        Intelligent pathfinding powered by advanced algorithms
      </p>
      <div className="flex flex-wrap justify-center gap-4 mb-10 slide-in-up delay-2">
        <span className="px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium backdrop-blur-sm breathing-light">
          Real-time Processing
        </span>
        <span className="px-5 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium backdrop-blur-sm breathing-light">
          Multi-route Optimization
        </span>
        <span className="px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium backdrop-blur-sm breathing-light">
          AI-powered
        </span>
      </div>
    </div>
  );
}
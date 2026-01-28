export default function Background() {
  return (
    <>
      {/* Animated background */}
      <div className="fixed inset-0 z-0 gradient-bg"></div>
      
      {/* Floating orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl floating breathing-light glow-element"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl floating breathing-light glow-element" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl floating breathing-light glow-element" style={{ animationDelay: '4s' }}></div>
      </div>
    </>
  );
}
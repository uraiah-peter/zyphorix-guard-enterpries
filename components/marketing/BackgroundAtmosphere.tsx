export function BackgroundAtmosphere() {
  return (
    <div className="fixed inset-0 pointer-events-none halo-pulse" style={{ zIndex: 0 }}>
      <div className="animate-drift-slow" style={{
        position: 'absolute', top: '-15%', left: '10%', width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent 70%)', filter: 'blur(50px)',
      }} />
      <div className="animate-drift-slow" style={{
        position: 'absolute', top: '5%', right: '0%', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%)', filter: 'blur(50px)',
        animationDelay: '-4s', animationDirection: 'reverse',
      }} />
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.09), transparent 72%)', filter: 'blur(60px)',
      }} />
    </div>
  );
}

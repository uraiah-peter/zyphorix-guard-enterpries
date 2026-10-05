export function TaglineRow() {
  const words = ['Secure', 'Automate', 'Innovate'];
  return (
    <div className="marketing-tagline-row max-w-4xl mx-auto px-4 sm:px-6 md:px-10 mt-8 md:mt-10 animate-fade-up" style={{ animationDelay: '0.78s' }}>
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {words.map((w, i) => (
          <span key={w} className="flex items-center gap-4 sm:gap-6">
            {i > 0 && <span style={{ width: 28, height: 1, background: 'rgba(148,163,184,0.25)' }} />}
            <span className="text-xs tracking-widest" style={{ color: '#64748b' }}>{w}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

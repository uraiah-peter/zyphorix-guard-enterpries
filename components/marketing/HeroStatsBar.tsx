import { ArrowRight } from 'lucide-react';
import { GlassButton } from './GlassButton';

export function HeroStatsBar() {
  return (
    <div className="marketing-stats-row max-w-4xl mx-auto px-4 sm:px-6 md:px-10 mt-3 animate-fade-up" style={{ animationDelay: '0.7s' }}>
      <div
        className="marketing-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center gap-5 sm:gap-8"
        style={{ background: 'linear-gradient(105deg, rgba(15,23,42,0.65), rgba(12,31,68,0.46))' }}
      >
        <div className="flex flex-1 items-center justify-around sm:justify-start gap-6 sm:gap-10 w-full sm:w-auto">
          <div className="text-center sm:text-left">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>$15,000/yr</p>
            <p className="text-xs" style={{ color: '#64748b' }}>A compliance vendor</p>
          </div>
          <div className="text-center sm:text-left">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>$10,000+</p>
            <p className="text-xs" style={{ color: '#64748b' }}>A security consultant</p>
          </div>
          <div className="text-center sm:text-left">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>from $0</p>
            <p className="text-xs" style={{ color: '#64748b' }}>Zyphorix Guard</p>
          </div>
        </div>
        <GlassButton href="/register" variant="primary" icon={<ArrowRight size={14} />} className="!px-5 !py-2.5 text-xs flex-shrink-0 w-full sm:w-auto">
          Start free
        </GlassButton>
      </div>
    </div>
  );
}

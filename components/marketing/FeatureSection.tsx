import { PROBLEMS } from '@/lib/marketing-content';
import { GlassCard } from './GlassCard';

export function FeatureSection() {
  return (
    <section id="problems" className="relative max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24" style={{ zIndex: 1 }}>
      <div className="text-center max-w-lg mx-auto mb-14 animate-fade-up">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
          Three problems that quietly become expensive
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
        {PROBLEMS.map((p) => {
          const Icon = p.icon;
          return (
            <GlassCard key={p.title} lift className="p-6">
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)' }}>
                <Icon size={20} style={{ color: '#60a5fa' }} strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{p.body}</p>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}

import { Link2, Zap, Cloud, ClipboardCheck } from 'lucide-react';

const FEATURES = [
  { icon: Link2, label: 'URL & Email Scanning', highlighted: false },
  { icon: Zap, label: 'AI Security Copilot', highlighted: true },
  { icon: Cloud, label: 'Cloud Security', highlighted: false },
  { icon: ClipboardCheck, label: 'SOC 2 Automation', highlighted: false },
];

export function FeatureIconRow() {
  return (
    <div className="marketing-feature-row max-w-4xl mx-auto px-4 sm:px-6 md:px-10 mt-14 md:mt-20 animate-fade-up" style={{ animationDelay: '0.62s' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="marketing-glass card-lift rounded-2xl px-4 py-5 text-center"
              style={
                f.highlighted
                  ? { background: 'linear-gradient(160deg, rgba(37,99,235,0.32), rgba(30,41,59,0.62))', border: '1px solid rgba(96,165,250,0.5)', boxShadow: '0 0 28px rgba(37,99,235,0.18)' }
                  : { background: 'rgba(15,23,42,0.42)', border: '1px solid rgba(147,197,253,0.16)' }
              }
            >
              <div
                className="mx-auto mb-3 flex items-center justify-center rounded-full"
                style={{ width: 38, height: 38, background: f.highlighted ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.1)' }}
              >
                <Icon size={17} style={{ color: '#60a5fa' }} />
              </div>
              <p className="text-xs font-medium">{f.label}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="w-1 h-1 rounded-full" style={{ background: '#3b82f6' }} />
                <span className="w-1 h-1 rounded-full" style={{ background: '#3b82f6' }} />
                <span className="w-1 h-1 rounded-full" style={{ background: '#3b82f6' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

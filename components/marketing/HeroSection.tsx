import { ArrowRight, ScanLine, Sparkles, ShieldCheck, Activity } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { ProductShowcase } from './ProductShowcase';
import { FeatureIconRow } from './FeatureIconRow';
import { HeroStatsBar } from './HeroStatsBar';
import { TaglineRow } from './TaglineRow';

export function HeroSection() {
  return (
    <section className="marketing-hero marketing-hero-overhaul relative overflow-hidden" style={{ zIndex: 1 }}>
      <div className="marketing-hero-grid" aria-hidden="true" />
      <div className="marketing-hero-orbit marketing-hero-orbit-a" aria-hidden="true" />
      <div className="marketing-hero-orbit marketing-hero-orbit-b" aria-hidden="true" />

      <div className="marketing-hero-inner relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="marketing-hero-kicker animate-fade-up" style={{ animationDelay: '0.04s' }}>
          <span className="marketing-status-dot" aria-hidden="true" />
          <Sparkles size={13} aria-hidden="true" />
          For teams who can't justify a $15,000 security tool
        </div>

        <div className="marketing-hero-layout">
          <div className="marketing-hero-copy-block">
            <p className="marketing-eyebrow animate-fade-up" style={{ animationDelay: '0.08s' }}>
              <ScanLine size={14} aria-hidden="true" />
              Security intelligence for the real world
            </p>
            <h1 className="marketing-hero-title marketing-hero-title-overhaul animate-fade-up" style={{ animationDelay: '0.12s' }}>
              The security stack that replaces your{' '}
              <span>compliance vendor</span>, your{' '}
              <span>consultant</span>, and your Sunday nights.
            </h1>
            <p className="marketing-hero-copy marketing-hero-copy-overhaul animate-fade-up" style={{ animationDelay: '0.18s' }}>
              Zyphorix Guard scans URLs, emails, files, and AWS infrastructure, automates SOC 2 evidence collection,
              and gives your team an AI copilot that actually knows your environment.
            </p>
            <div className="marketing-hero-actions animate-fade-up" style={{ animationDelay: '0.24s' }}>
              <GlassButton href="/register" variant="primary" icon={<ArrowRight size={15} />}>
                Get started free
              </GlassButton>
              <GlassButton href="#problems">
                Explore security
              </GlassButton>
            </div>
            <p className="marketing-hero-note animate-fade-up" style={{ animationDelay: '0.29s' }}>
              Free plan includes 10 scans a month. No card needed.
            </p>
          </div>

          <div className="marketing-telemetry-rail animate-fade-up" style={{ animationDelay: '0.22s' }} aria-label="Zyphorix Guard telemetry highlights">
            <div className="marketing-telemetry-head">
              <div>
                <span className="marketing-micro-label">GUARD TELEMETRY</span>
                <strong>Environment pulse</strong>
              </div>
              <span className="marketing-live-pill"><span /> LIVE</span>
            </div>
            <div className="marketing-telemetry-score">
              <div className="marketing-score-ring"><span>87</span><small>/100</small></div>
              <div><span className="marketing-micro-label">SECURITY SCORE</span><strong>Good posture</strong><p>+12% from last week</p></div>
            </div>
            <div className="marketing-telemetry-list">
              <div><ShieldCheck size={15} aria-hidden="true" /><span>AWS infrastructure</span><b>Secure</b></div>
              <div><Activity size={15} aria-hidden="true" /><span>SOC 2 controls</span><b>42 / 45</b></div>
              <div><ScanLine size={15} aria-hidden="true" /><span>Threats blocked</span><b>243</b></div>
            </div>
            <div className="marketing-signal-line" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </div>

        <ProductShowcase />
        <FeatureIconRow />
        <HeroStatsBar />
        <TaglineRow />
      </div>
    </section>
  );
}

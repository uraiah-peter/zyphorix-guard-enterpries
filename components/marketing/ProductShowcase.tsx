import { ArrowUpRight, Eye, Layers3, ShieldCheck } from 'lucide-react';

export function ProductShowcase() {
  return (
    <div className="marketing-product-shell marketing-demo-banner relative animate-fade-up" style={{ animationDelay: '0.34s' }}>
      <div className="marketing-demo-header">
        <div>
          <span className="marketing-eyebrow"><Layers3 size={14} aria-hidden="true" /> Inside the Guard command center</span>
          <h2>One view of the risk your team can actually act on.</h2>
        </div>
        <span className="marketing-demo-badge"><Eye size={14} aria-hidden="true" /> Product demonstration</span>
      </div>

      <figure className="marketing-demo-frame">
        <div className="marketing-demo-chrome" aria-hidden="true">
          <span /><span /><span />
          <small>dashboard.zyphorix.app</small>
          <b>● environment connected</b>
        </div>
        <div className="marketing-demo-image-wrap">
          <img
            src="/zyphorix-command-center.png"
            alt="Zyphorix Guard command center showing security score, threats blocked, scans, monitored assets, incidents, threat distribution, cloud security posture, and recent scans"
          />
          <div className="marketing-demo-glow" aria-hidden="true" />
        </div>
        <figcaption>
          <span><ShieldCheck size={14} aria-hidden="true" /> Live security posture across your environment</span>
          <span>Designed for action, not another report <ArrowUpRight size={14} aria-hidden="true" /></span>
        </figcaption>
      </figure>
    </div>
  );
}

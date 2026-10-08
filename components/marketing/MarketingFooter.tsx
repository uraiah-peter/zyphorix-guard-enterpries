import Link from 'next/link';
import { Twitter, Linkedin, Github } from 'lucide-react';

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative" style={{ zIndex: 1, borderTop: '1px solid rgba(147,197,253,0.12)', background: 'linear-gradient(180deg, rgba(5,8,16,0.42), rgba(2,4,9,0.86))', backdropFilter: 'blur(18px)' }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="marketing-brand-mark flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: '#071126' }}>
                <img src="/zyphorix-mark.png" alt="" width={30} height={30} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>Zyphorix Guard</span>
            </div>
            <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#64748b' }}>
              Enterprise AI cybersecurity, priced for teams who aren't enterprise-sized yet.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <a href="https://twitter.com/zyphorix" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-blue-400 transition-colors" style={{ color: '#64748b' }}>
                <Twitter size={16} />
              </a>
              <a href="https://linkedin.com/company/zyphorix" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-blue-400 transition-colors" style={{ color: '#64748b' }}>
                <Linkedin size={16} />
              </a>
              <a href="https://github.com/zyphorix" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-blue-400 transition-colors" style={{ color: '#64748b' }}>
                <Github size={16} />
              </a>
            </div>
          </div>
          <div>
            <p className="text-xs mb-4" style={{ color: '#475569' }}>Product</p>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="#pricing" className="hover:text-blue-400 transition-colors" style={{ color: '#94a3b8' }}>Pricing</Link>
              <Link href="#faq" className="hover:text-blue-400 transition-colors" style={{ color: '#94a3b8' }}>FAQ</Link>
              <Link href="/login" className="hover:text-blue-400 transition-colors" style={{ color: '#94a3b8' }}>Sign in</Link>
            </div>
          </div>
          <div>
            <p className="text-xs mb-4" style={{ color: '#475569' }}>Company</p>
            <div className="flex flex-col gap-3 text-sm">
              <span style={{ color: '#94a3b8' }}>Zyphorix Technologies</span>
              <span style={{ color: '#94a3b8' }}>Built by Uraiah Peter</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
          <p className="text-xs" style={{ color: '#475569' }}>© {year} Zyphorix Technologies</p>
          <p className="text-xs" style={{ color: '#475569' }}>Secure. Automate. Innovate.</p>
        </div>
      </div>
    </footer>
  );
}

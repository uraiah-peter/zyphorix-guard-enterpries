import Link from 'next/link';
import { GlassButton } from './GlassButton';

export function MarketingNavbar() {
  return (
    <header
      className="marketing-nav sticky top-3 mx-3 sm:mx-5 md:mx-8 z-50 flex items-center justify-between px-4 sm:px-6 md:px-10 py-3.5 rounded-2xl animate-fade-in"
      style={{
        background: 'rgba(5,8,16,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="marketing-brand-mark flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 32, height: 32, background: '#071126', boxShadow: '0 0 14px rgba(59,130,246,0.4)' }}>
          <img src="/zyphorix-mark.png" alt="Zyphorix Guard" width={32} height={32} />
        </div>
        <span className="brand-name hidden sm:inline truncate" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>Zyphorix Guard</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
        <Link href="#problems" className="hidden md:block text-sm hover:text-blue-400 transition-colors" style={{ color: '#cbd5e1' }}>Features</Link>
        <Link href="#pricing" className="hidden sm:block text-sm hover:text-blue-400 transition-colors" style={{ color: '#cbd5e1' }}>Pricing</Link>
        <Link href="#faq" className="hidden sm:block text-sm hover:text-blue-400 transition-colors" style={{ color: '#cbd5e1' }}>FAQ</Link>
        <Link href="/login" className="text-sm hover:text-blue-400 transition-colors" style={{ color: '#cbd5e1' }}>Sign in</Link>
        <GlassButton href="/register" variant="primary" className="!px-4 !py-2 text-sm">
          Start free
        </GlassButton>
      </div>
    </header>
  );
}

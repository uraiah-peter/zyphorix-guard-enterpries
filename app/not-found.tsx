import Link from 'next/link';
import Image from 'next/image';
import { ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: '#ffffff' }}>
      <div className="flex items-center justify-center rounded-2xl mb-6" style={{ width: 64, height: 64, overflow: 'hidden', boxShadow: '0 0 24px rgba(59,130,246,0.35)' }}>
        <Image src="/zyphorix-mark.png" alt="Zyphorix" width={64} height={64} priority />
      </div>
      <div className="flex items-center gap-2 mb-2" style={{ color: '#ef4444' }}>
        <ShieldAlert size={18} />
        <span className="text-xs font-semibold tracking-widest">404 — NOT FOUND</span>
      </div>
      <h1 className="text-2xl font-black text-[#0b0d10] mb-2">This page went off the radar</h1>
      <p className="text-sm max-w-md mb-8" style={{ color: '#71717a' }}>
        The page you're looking for doesn't exist, was moved, or you may not have access to it.
      </p>
      <Link href="/"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
        Back to safety
      </Link>
    </div>
  );
}

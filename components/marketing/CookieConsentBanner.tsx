'use client';
import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'zg-cookie-consent';
export type ConsentChoice = 'all' | 'necessary';

/**
 * Read the stored consent choice. Returns null if the user hasn't decided
 * yet. Any future non-essential script (analytics, etc.) should check this
 * before loading — e.g.:
 *
 *   if (getCookieConsent() === 'all') { loadAnalyticsScript(); }
 *
 * Nothing currently calls this for that purpose, since the app has no
 * non-essential cookies yet — the only cookie set today is the NextAuth
 * session cookie, which is strictly necessary and exempt from consent
 * requirements under GDPR/ePrivacy. This is the hook point for when that
 * changes, not a currently-active gate.
 */
export function getCookieConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'all' || stored === 'necessary' ? stored : null;
}

export function CookieConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null>('necessary'); // assume decided until checked, avoids a flash

  useEffect(() => {
    setChoice(getCookieConsent());
  }, []);

  function decide(value: ConsentChoice) {
    localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
  }

  if (choice !== null) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-up"
      role="region"
      aria-label="Cookie preferences"
    >
      <div className="glass-panel rounded-2xl p-5" style={{ background: 'rgba(6,10,20,0.94)' }}>
        <div className="flex items-start gap-3 mb-4">
          <Cookie size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
            We use only the cookies necessary to keep you signed in and secure. We don't use analytics
            or tracking cookies at this time — if that ever changes, we'll ask again.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => decide('all')}
            className="glow-btn flex-1 text-xs font-semibold py-2.5 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}
          >
            Accept
          </button>
          <button
            onClick={() => decide('necessary')}
            className="flex-1 text-xs font-medium py-2.5 rounded-full transition-colors hover:text-white"
            style={{ border: '1px solid rgba(59,130,246,0.25)', color: '#94a3b8' }}
          >
            Necessary only
          </button>
        </div>
      </div>
    </div>
  );
}

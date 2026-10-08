import { Sora, Inter } from 'next/font/google';
import { CookieConsentBanner } from '@/components/marketing/CookieConsentBanner';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} ${inter.variable}`}>
      {children}
      <CookieConsentBanner />
    </div>
  );
}

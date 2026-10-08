// CSP nonce: proxy.ts generates a per-request nonce and sets it on
// both the CSP response header and an `x-nonce` request header. Next.js
// auto-detects the nonce from the CSP header and applies it to its own
// framework/hydration scripts — no code here needs to do anything extra.
// If a manual inline <script> is ever added to this app, read the nonce
// via `(await headers()).get('x-nonce')` and pass it as the `nonce` prop.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Zyphorix Guard', template: '%s — Zyphorix Guard' },
  description: 'Enterprise AI-powered cybersecurity threat intelligence platform. Secure. Automate. Innovate.',
  icons: {
    icon: [
      { url: '/zyphorix-mark.png', sizes: '256x256', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

export const viewport = { width: 'device-width', initialScale: 1 };

// Sets data-theme on <html> before first paint, so switching themes doesn't
// flash the wrong palette while React hydrates. Reads the CSP nonce via
// headers() per this file's own existing convention for manual inline
// scripts (see module comment above — nonce comes from proxy.ts).
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('zg-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

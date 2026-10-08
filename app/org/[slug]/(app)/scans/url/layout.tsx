import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URL Scanner',
  description: 'Scan URLs for phishing and malicious content.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

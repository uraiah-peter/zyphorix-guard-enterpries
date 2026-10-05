import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Scanner',
  description: 'Scan emails for phishing and malicious content.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

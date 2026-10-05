import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Domain & IP Lookup',
  description: 'Look up threat intelligence for domains and IP addresses.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

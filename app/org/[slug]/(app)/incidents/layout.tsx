import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Incident Management',
  description: 'Track and respond to active security incidents.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cloud Connection',
  description: 'View details for a connected cloud account.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Incident Details',
  description: 'View details and timeline for a security incident.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

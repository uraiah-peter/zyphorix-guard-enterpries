import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan Details',
  description: 'View detailed results for a security scan.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

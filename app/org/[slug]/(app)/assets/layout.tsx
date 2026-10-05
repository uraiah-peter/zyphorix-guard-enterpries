import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asset Inventory',
  description: 'View and manage monitored assets across your organization.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

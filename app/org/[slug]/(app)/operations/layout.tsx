import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guard Operations',
  description: 'Connect Zyphorix security signals to response ownership and audit-ready proof.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View recent alerts and notifications.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

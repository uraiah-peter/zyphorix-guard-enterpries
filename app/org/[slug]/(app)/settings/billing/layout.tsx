import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing',
  description: 'Manage your subscription and billing details.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

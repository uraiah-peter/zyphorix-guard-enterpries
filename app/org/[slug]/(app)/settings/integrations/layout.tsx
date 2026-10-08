import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Connect Zyphorix Guard with your other tools.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

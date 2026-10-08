import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOC 2 Compliance & Operations',
  description: 'Track SOC 2 controls, evidence activity, response items, and audit readiness.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

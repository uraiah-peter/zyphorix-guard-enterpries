import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playbooks',
  description: 'Automate incident response with security playbooks.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

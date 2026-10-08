import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cloud Security',
  description: 'Monitor the security posture of your cloud accounts.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

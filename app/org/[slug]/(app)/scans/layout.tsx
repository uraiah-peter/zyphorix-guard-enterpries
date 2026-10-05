import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Monitoring',
  description: 'Review scan activity across your organization.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

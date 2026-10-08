import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Set up your Zyphorix Guard organization.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

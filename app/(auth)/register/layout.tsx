import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your Zyphorix Guard account.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'File Scanner',
  description: 'Scan files for malware and security threats.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

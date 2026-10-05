import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Security Copilot',
  description: 'Ask the AI Security Copilot about threats and best practices.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

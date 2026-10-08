import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log Ingestion',
  description: 'Ingest and query security logs.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

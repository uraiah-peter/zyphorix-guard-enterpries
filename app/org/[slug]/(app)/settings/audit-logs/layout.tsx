import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { requirePagePermission } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Generate and review security and audit reports.',
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function Layout({ children, params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (user?.id) await requirePagePermission(slug, user.id, 'auditlog:read');
  return children;
}

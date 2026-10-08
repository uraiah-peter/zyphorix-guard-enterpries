import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { requirePagePermission } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'API Keys',
  description: 'Manage API keys for programmatic access.',
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function Layout({ children, params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (user?.id) await requirePagePermission(slug, user.id, 'apikey:manage');
  return children;
}

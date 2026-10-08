import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your organization\'s security overview at a glance.',
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

// PROTECTED — do not modify. This preserves the dashboard's chrome exactly
// as it existed before the black/blue internal-pages redesign. All other
// org routes get their chrome from app/org/[slug]/(app)/layout.tsx instead.
export default async function DashboardLayout({ children, params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/org/${slug}/dashboard`);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar orgSlug={slug} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar userName={user.name} userEmail={user.email} userImage={user.image} />
        <main className="flex-1 overflow-hidden p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

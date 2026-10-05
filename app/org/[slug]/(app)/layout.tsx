import { getCurrentUser } from '@/lib/auth';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppTopbar } from '@/components/layout/AppTopbar';
import { redirect } from 'next/navigation';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AppShellLayout({ children, params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/org/${slug}/dashboard`);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar orgSlug={slug} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppTopbar userName={user.name} userEmail={user.email} userImage={user.image} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

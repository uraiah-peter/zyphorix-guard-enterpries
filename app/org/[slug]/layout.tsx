export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrgProvider } from '@/components/layout/OrgProvider';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const org = await db.organization.findUnique({ where: { slug }, select: { name: true } });
  return { title: { template: `%s — ${org?.name ?? 'Zyphorix Guard'}` } };
}

// This layout is intentionally chrome-free — it only handles auth,
// membership verification, and org data-fetching, shared by both the
// dashboard route (which keeps its own frozen Sidebar/Topbar via
// dashboard/layout.tsx) and every other org route (which gets the new
// dark chrome via (app)/layout.tsx). Splitting it this way means neither
// chrome variant duplicates this auth logic, and neither can accidentally
// affect the other's visual appearance.
export default async function OrgLayout({ children, params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/org/${slug}/dashboard`);

  const [org, membership] = await Promise.all([
    db.organization.findUnique({
      where: { slug },
      include: { subscription: true, settings: true },
    }),
    db.organizationMember.findFirst({
      where: {
        organizationId: (await db.organization.findUnique({ where: { slug }, select: { id: true } }))?.id ?? '',
        userId: user.id!,
      },
    }),
  ]);

  if (!org) notFound();
  if (!membership) redirect('/org-select');

  return <OrgProvider org={org} membership={membership}>{children}</OrgProvider>;
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding development database...');

  // ── Demo user ────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 12);

  const user = await db.user.upsert({
    where: { email: 'demo@zyphorix.com' },
    update: {},
    create: {
      email: 'demo@zyphorix.com',
      name: 'Uraiah Peter',
      password,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Demo user: ${user.email} / Password123!`);

  // ── Demo organization ─────────────────────────────────────────────────────
  const existingOrg = await db.organization.findUnique({ where: { slug: 'zyphorix-demo' } });

  if (!existingOrg) {
    const org = await db.organization.create({
      data: {
        name: 'Zyphorix Technologies',
        slug: 'zyphorix-demo',
        industry: 'technology',
        size: '1-10',
        website: 'https://zyphorix.com',
      },
    });

    // Owner membership
    await db.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    });

    // Settings
    await db.organizationSettings.create({
      data: { organizationId: org.id },
    });

    // PRO subscription
    await db.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Sample notification
    const notification = await db.notification.create({
      data: {
        organizationId: org.id,
        type: 'MEMBER_JOINED',
        title: 'Welcome to Zyphorix Guard',
        message: 'Your organization is set up and ready. Start by running your first scan.',
        actionUrl: `/org/${org.slug}/scans/url`,
      },
    });

    await db.userNotification.create({
      data: { notificationId: notification.id, userId: user.id },
    });

    // Sample audit log
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'ORG_CREATED',
        resource: 'organization',
        resourceId: org.id,
        metadata: { name: org.name, slug: org.slug },
      },
    });

    console.log(`✅ Demo org: /org/${org.slug}/dashboard`);
  } else {
    console.log('ℹ️  Demo org already exists — skipping');
  }

  console.log('\n🎉 Seed complete!');
  console.log('   URL:      http://localhost:3000');
  console.log('   Email:    demo@zyphorix.com');
  console.log('   Password: Password123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });

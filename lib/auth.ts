import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getRevokedAt } from '@/lib/session-revocation';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt', maxAge: 30*24*60*60 },
  pages: { signIn: '/login', error: '/login', newUser: '/onboarding' },
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! }),
    GitHub({ clientId: process.env.AUTH_GITHUB_ID!, clientSecret: process.env.AUTH_GITHUB_SECRET! }),
    Credentials({
      name: 'credentials',
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;
        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Self-managed issued-at claim, not the JWT library's built-in
        // `iat` — deliberately not relying on the exact cross-version
        // availability/semantics of that field inside this callback.
        token.issuedAt = Math.floor(Date.now() / 1000);
      }
      // Revocation check on every request. Uses Redis rather than a direct
      // Postgres/Prisma query — this callback runs in whatever runtime
      // proxy.ts runs in, which (as of the Next.js 16 middleware→proxy
      // migration) is unconditionally Node.js, so Prisma would work here
      // too. Redis is still the better choice: an HTTP KV read is
      // meaningfully faster than a Postgres round-trip on every single
      // authenticated request, not just an Edge-compatibility workaround.
      // See lib/session-revocation.ts for the full rationale. Degrades
      // gracefully to "not revoked" if Redis isn't configured.
      if (typeof token.id === 'string' && typeof token.issuedAt === 'number') {
        const revokedAt = await getRevokedAt(token.id);
        token.revoked = !!(revokedAt && token.issuedAt < revokedAt);
      }
      return token;
    },
    async session({ session, token }) {
      // Deliberately omit user.id when revoked, rather than trying to force
      // a sign-out from within this callback — every authorization check in
      // this app (see proxy.ts) gates on session?.user?.id, so a
      // missing id is already treated as "not authenticated" everywhere,
      // with no separate revocation-aware code path needed elsewhere.
      if (token.revoked) return session;
      if (token.id && session.user) session.user.id = token.id as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials' && user.email) {
        await db.user.update({ where: { email: user.email }, data: { emailVerified: new Date() } }).catch(() => {});
      }
      return true;
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

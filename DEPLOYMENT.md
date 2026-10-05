# Zyphorix Guard Enterprise — Deployment Guide

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ (Neon recommended for serverless)
- Upstash Redis account
- Vercel account (for hosting)
- Stripe account (for billing)
- Groq API key (for AI features)

---

## 1. Environment Setup

Copy `.env.local` and fill in all values:

```bash
cp .env.local .env.local.production
```

Required variables:
```
DATABASE_URL            # Neon PostgreSQL connection string
DIRECT_URL              # Neon direct connection (for migrations)
AUTH_SECRET             # openssl rand -base64 32
AUTH_GOOGLE_ID          # Google OAuth client ID
AUTH_GOOGLE_SECRET      # Google OAuth client secret
AUTH_GITHUB_ID          # GitHub OAuth app client ID
AUTH_GITHUB_SECRET      # GitHub OAuth app client secret
GROQ_API_KEY            # From console.groq.com/keys
STRIPE_SECRET_KEY       # From Stripe dashboard
STRIPE_WEBHOOK_SECRET   # From Stripe webhook settings
STRIPE_STARTER_PRICE_ID # From Stripe product catalog
STRIPE_PRO_PRICE_ID     # From Stripe product catalog
UPSTASH_REDIS_REST_URL  # From Upstash console
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY          # From resend.com
NEXT_PUBLIC_APP_URL     # Your production domain
```

---

## 2. Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed development data (dev only)
npm run db:seed

# Run migrations in production
npx prisma migrate deploy
```

---

## 3. Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Link project to Vercel
vercel link

# Add environment variables
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
# ... repeat for all required env vars

# Deploy
vercel --prod
```

### Vercel Configuration

Set these in Vercel project settings:
- **Framework Preset**: Next.js
- **Root Directory**: ./
- **Node.js Version**: 22.x
- **Build Command**: `npm run build`
- **Install Command**: `npm ci`

### Post-deploy webhook

After your first deploy, configure the Stripe webhook:
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/billing/webhook`
3. Events: `customer.subscription.*`, `invoice.payment_*`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 4. Docker Deployment

### Local development with Docker

```bash
# Start PostgreSQL + Redis
cd docker && docker compose up -d

# Update .env.local with Docker connection strings:
# DATABASE_URL=postgresql://zyphorix:zyphorix_dev_password@localhost:5432/zyphorix_guard

# Run the app locally (still hot-reloads)
npm run dev
```

### Production with Docker

```bash
# Build the image
docker build -f docker/Dockerfile -t zyphorix-guard:latest .

# Run with docker-compose
docker compose -f docker/docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/api/health
```

---

## 5. CI/CD Setup

### Required GitHub Secrets

Go to GitHub repo → Settings → Secrets and Variables → Actions:

```
VERCEL_TOKEN        # From vercel.com/account/tokens
VERCEL_ORG_ID       # From .vercel/project.json (run `vercel link` first)
VERCEL_PROJECT_ID   # From .vercel/project.json
DATABASE_URL        # Production database URL
DIRECT_URL          # Production direct database URL
CODECOV_TOKEN       # From codecov.io (optional)
```

### Branch Strategy

- `main` → Production deploy (auto)
- `develop` → CI checks only (no deploy)
- Feature branches → CI checks only

---

## 6. Sentry Error Monitoring

1. Create project at sentry.io
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/xxx
   ```
3. Errors are automatically captured in production

---

## 7. Performance Checklist

- [ ] Neon database in same region as Vercel deployment
- [ ] Upstash Redis in same region
- [ ] Vercel Edge Network enabled (automatic)
- [ ] Image domains configured in `next.config.ts`
- [ ] `prisma generate` runs in build step
- [ ] Database connection pooling via Neon's built-in pooler

---

## 8. Security Checklist

- [ ] All environment variables set (none using defaults)
- [ ] `AUTH_SECRET` is at least 32 random bytes
- [ ] Stripe webhook signature verification active
- [ ] CORS not overly permissive
- [ ] Rate limiting active (requires Upstash Redis)
- [ ] Content Security Policy headers applied (via middleware)
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] No credentials in source code or git history

---

## 9. Monitoring Checklist

- [ ] Sentry DSN configured and receiving events
- [ ] Uptime monitor on `/api/health`
- [ ] Vercel Analytics enabled
- [ ] Stripe webhook delivery monitoring enabled
- [ ] Database connection count monitored (Neon dashboard)

---

## Troubleshooting

**Build fails with "Prisma engine not found"**
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

**Stripe webhooks not received locally**
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

**Database connection timeout**
Check that `DIRECT_URL` is set alongside `DATABASE_URL` (required by Neon for migrations).

**NextAuth callback URL mismatch**
Ensure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` match your deployment domain exactly.

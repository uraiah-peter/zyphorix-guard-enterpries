# Setup — Zyphorix Guard Enterprise

## ⚠️ About `prisma/schema.prisma`

The original schema file was missing from the project export. Claude
reconstructed it (2026-09-01) by cross-referencing every `db.<model>` call,
zod validation schema, and `@prisma/client` type import across the codebase.
It's a best-effort reconstruction, **not the recovered original** — review
it before trusting it with real data. See the comment block at the top of
`prisma/schema.prisma` for exactly how it was derived. Things worth
double-checking against your actual product decisions:

- Field precision/limits Prisma can't infer from code (e.g. exact `String`
  length caps beyond what zod validates)
- `onDelete` cascade behavior on relations (defaulted to `Cascade` for
  org-owned data, which seemed intended but wasn't explicitly stated anywhere)
- `@@index` choices (added on the query patterns actually seen in the API
  routes, but there may be others worth adding)
- The `Organization.size` field is a plain `String` (not an enum) because
  the app's own zod schema validates it against `'1-10' | '11-50' | ...`,
  and those values aren't legal Prisma enum identifiers

## Quick start

```bash
npm install

# Start local Postgres + Redis
npm run docker:dev

# Push the schema and seed demo data
npm run db:generate
npm run db:push
npm run db:seed

# Run the app
npm run dev
```

Visit `http://localhost:3000`. Demo login: `demo@zyphorix.com` / `Password123!`

## Environment

`.env.local` is already filled in with working local defaults (matches
`docker-compose.yml`'s Postgres credentials, plus a generated `AUTH_SECRET`).
Everything else — Stripe, Groq, VirusTotal, AWS, OAuth, Sentry — is optional
for local testing; those features will show a friendly config error or no-op
until you add real keys.

## Guard Operations workspace

Zyphorix Guard now includes a separate **Guard Operations** workspace. It is a
Zyphorix-native operations layer that connects security signals to response
ownership and audit-ready proof. It intentionally uses Zyphorix's own
evidence-first workflow and visual language rather than reproducing another
product's dashboard layout.

### What it includes

- **Signal ledger** — recent scans, incidents, and account activity presented
  as a concise evidence trail.
- **Response lane** — open incidents with severity, status, age, and direct
  links to incident ownership.
- **Evidence pulse** — recent log signals that can support compliance review.
- **Proof readiness** — quick links and status cues for scan evidence,
  incident ownership, and compliance controls.
- **Operations actions** — direct entry points for Log Ingestion, focused
  scans, and AI Security Copilot.
- **Workspace health** — service state from the existing health endpoint,
  presented as a Zyphorix readiness signal.

### Local setup

No new environment variables are required. The toolkit reads the same
organization and compliance data used by the existing Compliance Center.

1. Start the local services and app:

   ```bash
   npm run docker:dev
   npm run db:generate
   npm run db:push
   npm run db:seed
   npm run dev
   ```

2. Sign in with the demo account from the Quick start section.
3. Open the organization workspace and choose **Guard Operations** from the
   **Protect** section of the sidebar.
4. Review the signal ledger and response lane, then open the linked scan,
   incident, log, or AI workflow when follow-up is needed.
5. Open **SOC 2 Compliance** when the operational work needs to be mapped to
   controls and audit evidence.
6. For real evidence signals, run URL, email, file, or cloud scans; ingest
   security logs; and configure integrations or playbooks. Refresh Guard
   Operations after the source data has been collected.

### Production checklist

Before using the toolkit with real audit work:

- Configure the production database and run `npm run db:generate` followed by
  the appropriate Prisma migration command.
- Configure the integrations and credentials required for the scan, cloud,
  log-ingestion, and notification workflows you intend to use.
- Confirm that organization access controls are working for owners, analysts,
  and viewers.
- Review evidence mappings and remediation text with your compliance owner.
- Treat the operations feed as evidence-preparation support, not as an audit
  opinion. A licensed CPA firm still performs the official SOC 2 audit.

### Intended operating rhythm

- **Daily:** review the Signal Ledger and Response Lane, then assign or update
  open incidents.
- **Weekly:** inspect Proof Readiness, scan telemetry, log coverage, and the
  SOC 2 control list; add missing manual evidence.
- **Before an audit:** refresh Guard Operations and the Compliance Center,
  review the evidence trail, and confirm that every critical gap has an owner
  and remediation note.

## Recommended VS Code extensions

- Prisma (schema syntax highlighting + formatting)
- Tailwind CSS IntelliSense
- ESLint

# Zyphorix Guard — Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x (current) | ✅ |
| < 1.0 | ❌ |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Send a detailed report to: **security@zyphorix.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

We will acknowledge within **48 hours** and provide a timeline within **5 business days**.

---

## Security Architecture

### Authentication
- NextAuth.js v5 with JWT sessions (HttpOnly, Secure, SameSite=Lax cookies — Lax, not Strict, is required so the session survives the redirect back from Google/GitHub OAuth)
- Session revocation: resetting your password invalidates all existing sessions immediately (Redis-backed revocation timestamp, checked on every request — see `lib/session-revocation.ts`). Without Redis configured, this check is skipped and sessions remain valid for their full 30-day lifetime.
- bcrypt cost factor 12 for password hashing
- Email verification required for credential-based accounts (OAuth accounts are verified by the provider)
- OAuth 2.0 via Google and GitHub

### Authorization
- Role-based access control (OWNER > ADMIN > ANALYST > VIEWER)
- Every API route enforces permission checks server-side
- Organization isolation: all queries scoped by `organizationId`
- Privilege escalation prevention: cannot assign roles equal to or higher than your own

### Data Protection
- All data encrypted at rest (Neon PostgreSQL with AES-256)
- All data encrypted in transit (TLS 1.3)
- API keys stored as SHA-256 hashes only — raw key shown once
- AWS credentials never stored — cross-account IAM role ARN only
- No PII logged to stdout or error tracking

### HTTP Security
- Content Security Policy (strict)
- HSTS with 1-year max-age
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Permissions-Policy: restricts camera, microphone, geolocation

### Rate Limiting
- Auth endpoints (login, register, password reset): 10 / 5 / 5 requests per 15–60 min per IP, enforced centrally in `proxy.ts`
- General API endpoints: 100 requests / minute / authenticated user or API key
- AI chat: 20 requests / minute / org (independent of the monthly plan quota)
- Cloud sync: 1 request / 15 minutes / connection (atomic, race-condition-safe)
- Backed by Upstash Redis in production; falls back to a per-process in-memory limiter if Redis isn't configured (adequate for local dev, not a substitute for Redis in a multi-instance deployment — see `lib/rate-limit.ts`)

### Input Validation
- All inputs validated with Zod before processing
- SQL injection: prevented by Prisma parameterized queries
- XSS: prevented by React's default escaping
- File uploads: processed in-memory, never persisted to disk
- Scan inputs: never passed to external services without sanitization

### AI Safety
- GROQ_API_KEY server-side only, never sent to client
- User scan inputs wrapped in XML tags to prevent prompt injection
- AI responses streamed — no storage of conversation history in Phase 4

### Dependency Security
- `npm audit` runs in CI pipeline
- Dependabot configured for automatic security PRs
- No transitive dependencies with known HIGH/CRITICAL CVEs

---

## Bug Bounty

We currently operate a private bug bounty program. Contact security@zyphorix.com to apply.

**In scope:**
- Authentication bypass
- Authorization flaws (accessing other orgs' data)
- SQL injection
- Remote code execution
- Sensitive data exposure

**Out of scope:**
- Self-XSS
- Social engineering
- Physical attacks
- Issues requiring physical access to infrastructure

---

## Disclosure Policy

We follow responsible disclosure:
1. You report privately
2. We confirm and investigate (≤ 5 business days)
3. We develop and test a fix
4. We release the fix
5. We credit you (if desired) after 90 days or fix release

Built by **Uraiah Peter** — Zyphorix Technologies

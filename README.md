# TalentFlow ATS

TalentFlow is a standalone, full-stack applicant tracking system for recruiting teams. It provides an authenticated staff workspace for recruiting operations and a separate candidate portal for application status and interview context.

## Product surfaces

The internal workspace includes a recruitment overview, candidate directory, jobs, applications, drag-and-drop pipeline, interviews, analytics, notifications, and settings. Internal staff sign in with work email and password. Access is role-aware: administrators and recruiters can create candidates and jobs or move applications; hiring managers and interviewers can review the workspace according to their role.

Candidates use a separate Google OpenID Connect flow. Google login never grants staff access: it is limited to records whose role is `candidate`, and the callback creates or updates a candidate profile tied to the verified email. Candidate procedures only return the signed-in candidate's own applications and interviews.

## Architecture

The application uses React 19, Vite, Tailwind CSS, Express, tRPC, Drizzle ORM, and MySQL/TiDB. Authentication is implemented locally with bcrypt password hashes, opaque random session tokens stored as SHA-256 hashes, HTTP-only same-site cookies, one-time password-reset tokens, Google OIDC for candidates, and audit-log writes for sensitive staff actions. Private tRPC procedures are guarded by session and role middleware; there are no public ATS data procedures.

The server also includes Helmet security headers, authentication rate limiting, a `/healthz` endpoint, bounded request bodies, secure cookie behavior behind HTTPS, and a centralized error boundary that avoids returning stack traces to clients.

## Development

```bash
pnpm install
cp deploy/env.template .env
pnpm db:push
pnpm seed
pnpm dev
```

The development seed creates demo staff users using the password from `SEED_STAFF_PASSWORD` (default: `TalentFlow123!`). Change the value before using a shared environment. The seed is idempotent for demo records, but it intentionally refreshes seeded password hashes so the local credentials remain usable.

Example staff accounts are created for administrator, recruiter, hiring manager, and interviewer roles. They are demonstration data only and must be replaced or disabled in a real deployment.

## Environment variables

`DATABASE_URL` is required for MySQL/TiDB. `JWT_SECRET` remains available for deployments that already provision it, although application sessions use opaque database-backed tokens. `PUBLIC_APP_URL` should be the canonical HTTPS URL. Candidate Google login requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and an optional `GOOGLE_REDIRECT_URI`; if the redirect URI is omitted, the server derives `/api/auth/google/callback` from the request host.

## Production build

```bash
pnpm check
pnpm test
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

Deploy the Node server and the built static assets as one service. Configure the database and secrets through the hosting provider's secret manager; do not commit `.env` files. Register the exact production callback URL with Google, use HTTPS, and set `PUBLIC_APP_URL` to the same origin. The container can be built with the included `Dockerfile` and should expose port 3000.

## API conventions

All application data flows through typed tRPC procedures under `/api/trpc`. The standalone auth routes are:

| Route | Purpose |
|---|---|
| `POST /api/trpc/auth.staffLogin` | Internal password login |
| `POST /api/trpc/auth.logout` | Revoke the current session |
| `POST /api/trpc/auth.requestPasswordReset` | Start a generic reset flow without account enumeration |
| `POST /api/trpc/auth.resetPassword` | Consume a one-time reset token |
| `GET /api/auth/google` | Start candidate-only Google OIDC |
| `GET /api/auth/google/callback` | Validate state, verified email, and candidate role |
| `GET /healthz` | Liveness check |

Password reset delivery is intentionally provider-neutral. In development the generated URL is logged; production should connect `issuePasswordReset` to the organization's approved email provider without exposing tokens in an API response.

## Verification

Run `pnpm check` for TypeScript validation and `pnpm test` for authentication and role-boundary regression tests. Use the browser to verify that logged-out users see the staff/candidate login surface, staff users see only the internal workspace, candidate users see only the candidate portal, and role-forbidden mutations return a 403 response.

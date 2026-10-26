# PledgeOFF private terminal — phase 1

Implemented on `feature/private-terminal`. No deployment, external migration, DNS or hosting change is part of this work.

## Local setup

1. Use a **separate Supabase development project**. Do not use the production project or production keys.
2. Privately provision a confirmed email/password Auth user in Supabase. Set the password through a secure private enrollment/reset process; never put it in source control or chat. Do not enable MFA for this phase. If the account already has MFA enabled, provision a separate suitable development account instead of bypassing MFA.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the development project URL and anon key, the confirmed user's immutable Auth UUID and email. Keep the `PRIVATE_TERMINAL_*` fields server-only, without a `NEXT_PUBLIC_` prefix. The visible login alias is `bashui`; this is not a Supabase username or user-editable metadata field.
4. Set `PRIVATE_TERMINAL_ORIGIN=http://localhost:3000` to match your browser URL exactly. For another hostname/port, change this value and restart Next.js.
5. From the repository root:

   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter @pledgeoff/web dev
   ```

6. Open `http://localhost:3000/login`. Sign in with `bashui` and the privately provisioned user's password. All seven sections are available under `/terminal/…`; `/` and `/dashboard` lead to Overview after authentication.

Without identity configuration, the login screen remains available, sign-in returns 503, and private access is denied. There is no bypass, hardcoded password, demo session, public signup or exchange connection.

The demo terminal needs no database tables, existing idea data, service-role key, LLM key or Stripe configuration. Legacy data and code remain in place, but legacy pages, APIs, webhooks and crons are retired by the global server route boundary. Anonymous API requests receive 401; authorized requests to retired endpoints receive 410. Retired pages redirect anonymous visitors to login and return 410 to the authorized user. Old API keys and cron credentials do not grant terminal access.

## Supabase configuration still required (development only)

- Provision the authorized confirmed Auth identity and privately set/reset its password.
- Disable public signups in the Supabase Auth dashboard, including unused OAuth providers, anonymous users and unused enrollment methods. Removing the app's signup UI does not disable direct calls to the Auth service.
- Use the development site's origin for Auth Site URL and tightly scoped enrollment/recovery redirect URLs. Public legacy `/auth/callback` and `/reset-password` routes are retired. Administrator-assisted enrollment/recovery must use a separate secure flow; the application does not implement a public recovery route.
- Keep refresh-token rotation enabled. Set a short access-token lifetime appropriate to private use (for example 15 minutes). Logout revokes refresh sessions globally and clears this browser's cookies; already issued access tokens can remain valid until expiry under Supabase's JWT model.
- Keep RLS and storage permissions restricted. The phase 1 demo does not read financial records from Supabase, and app routing does not replace database authorization. Existing tables/storage must be audited separately before reusing them for finance. New financial tables will require exact authorized-user policies and least-privilege grants.
- `supabase/config.toml` is now a local-only configuration with signup disabled and localhost Site URL. It does not change any remote Supabase project. Migrations under `infra/supabase/migrations` are untouched and are not automatically applied by this setup.
- Production login deliberately fails closed without a shared Upstash rate limiter. Configure its server-only URL/token in an isolated environment before any future release. Local development uses an in-memory limiter. Login allows three attempts per ten minutes per IP and globally; restarting the local process resets local buckets.

## Session and route protection

- Supabase verifies credentials server-side with the anon key; only the configured confirmed Auth UUID is accepted. The server-only email/UUID mapping is not exported in the client bundle or login response. Supabase session cookies can contain user identity metadata and are HttpOnly. No service-role key is used by the terminal.
- Auth cookies are HttpOnly, SameSite=Lax and Secure in production. The proxy refreshes sessions and forwards rotated cookies; layouts and pages independently recheck the authorized identity.
- Login/logout require a matching Origin. Mutations use POST. Sign-in failures do not reveal the configured email. Rate-limit failure blocks sign-in.
- Private and retired HTTP responses carry no-store, noindex, frame denial and restrictive embedding/form policies. The previous offline worker is retired and its PledgeOFF caches cleared; the new application does not register an offline cache.
- The apex-to-www 308 redirect is prepared in `src/proxy.ts`, only for the exact `pledgeoff.com` hostname. Local and preview hosts are unaffected. No DNS or Vercel setting was changed. A future release must set the canonical origin to `https://www.pledgeoff.com`.
- DEMO state is rendered on the server after authorization. There are no public financial-data endpoints and no live execution controls. Heartbeat and STOP are explicitly shown as unavailable because no engine is connected.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm --workspace-concurrency=1 -r test --maxWorkers=1
pnpm --filter @pledgeoff/web exec playwright test --config playwright.private.config.ts
pnpm build
```

The private Playwright configuration starts Next.js on `127.0.0.1:3100` and a test-only Supabase Auth HTTP contract fixture on `127.0.0.1:54325`. Its temporary password is generated in memory per run. It never contacts production, staging or a real Supabase project. It verifies anonymous denial, retired routes, login, all seven sections, HttpOnly cookies, CSRF rejection, logout and mobile overflow. It saves desktop/mobile screenshots under `/tmp/pledgeoff-*.png`.

The default `test:e2e` script now uses the private local configuration. The archived `playwright.config.ts` still describes legacy staging tests and must only be invoked explicitly when intended. Tests with the local Auth fixture do not establish that a real Supabase project is correctly configured. A separate development Supabase integration check remains necessary before release.

Build checks can use localhost Supabase placeholders; an authenticated runtime requires the actual isolated development configuration. Do not provide service-role keys for a phase 1 demo build.

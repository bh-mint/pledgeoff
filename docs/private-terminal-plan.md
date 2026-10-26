# PledgeOFF — Private Terminal

## Scope
Replace the public idea-validation experience with a private, authenticated dashboard. Keep the public brand **PledgeOFF** only; do not use “AI Trading Bot” or similar wording in visible titles or branding.

## Confirmed decisions
- Username: `bashui` (display/login alias; map securely to Supabase Auth identity).
- Require authentication on both apex and www domains; canonical host: `www.pledgeoff.com`.
- No 2FA at launch (user preference).
- Do not request or store a password in GitHub or chat. Set password via secure private enrollment/reset flow.
- Existing deployment remains untouched until explicit approval and passing tests.
- Trading engine planned for user-operated Linux Mint laptop; Vercel serves UI; Supabase stores restricted state.
- Paper trading first; live execution disabled by default, requiring separate explicit approval and tested risk limits.

## Security acceptance criteria
- Server-side route and API authorization, not just client-side redirects.
- Supabase Auth, restricted user allowlist, secure sessions, rate limits and logout.
- No financial records or credentials publicly accessible; database RLS and least-privilege service credentials.
- Binance keys never committed, logged, exposed to browser, or stored in public database tables.
- All public legacy routes audited; private routes gated or retired.
- Set noindex headers/metadata for authenticated pages.
- Verify STOP command acknowledgement and heartbeat/offline status.

## Archive / deployment checklist
- Git code snapshot branch: `archive/pre-private-terminal-2026-10-26`.
- Before cutover: backup Supabase database/schema/storage as applicable; record Vercel environment configuration securely; document rollback.
- Build in `feature/private-terminal`; CI checks, test auth/unauthenticated flows, security review, and preview deploy.
- Only then request approval for production cutover.

## Proposed navigation
Overview / Markets / Strategies / Activity / Portfolio / History / Settings.

## Constraints
Do not promise profitable trades. All trading signals must account for exchange filters, minimum notional, fees, spread, slippage, and risk. Paper-trading results do not imply future performance.

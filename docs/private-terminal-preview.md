# Private terminal Preview / Development setup

Status: remote configuration in progress, 2026-10-27. User authorized use of existing local credentials to continue Preview/Development setup. No deployments performed.

## Published Preview — 2026-10-27

Implementation commit `db6bb73e4ece9a9398b1566a55d26822b898eca6` was pushed to `feature/private-terminal`. Vercel deployment `dpl_GECwbCVMYJQ7TcHYfYk3RaaVEyGm` is **READY**, running the updated Next.js 16.4.1 dependency set.

Use **https://pledgeoff-git-feature-private-terminal-pledgeoff.vercel.app/login**, matching PRIVATE_TERMINAL_ORIGIN. The immutable deployment hostname is different and is not the configured login/logout origin.

HTTPS checks against the deployed app passed Vercel protection, anonymous route/API denial, CSRF, real Supabase server-side refresh, actual server-issued Secure/HttpOnly/SameSite cookies, all seven sections, JWT 900 seconds, retired API 410, logout/cookie clearing and revoked refresh. QA used an unmailed admin-generated session for the existing confirmed user, without changing its password or giving the application the admin key. Only cached expiry metadata was shortened to trigger refresh; natural JWT expiration was not awaited.

Password sign-in and a second real identity remain unverified. The user should test the existing password directly in the browser; never collect it in chat or reset it as part of QA. Temporary Vercel access used by the browser harness was revoked. Evidence: `/tmp/pledgeoff-published-preview-results.json`, `/tmp/pledgeoff-published-preview-auth-results.log`.

This report is a documentation-only follow-up to the validated implementation. No Production promotion, merge, DNS change, paid resource or Production configuration write occurred. Older sections below retain historical states; this published state supersedes them.

## Publication authorization — 2026-10-27

The user explicitly approved committing and publishing a new Preview. Publish only `feature/private-terminal`; no merge, production promotion or Production configuration change. The implementation and credential scan passed final review. Await deployment readiness and remote route/Auth checks before reporting publication complete.

## Current: dedicated Redis configured; real Auth session verified

The user confirmed acceptance of the marketplace terms. A preflight showed no resources, then `pledgeoff-private-preview` was created once: `store_oBN2TOfdCGblyYRt`, installation `icfg_lTv3KeqJjKvGMsIg84x9RLoO`, **Free**, primaryRegion=fra1, autoUpgrade=false, prodPack=false, eviction=false. Readback after testing confirmed these settings and status available.

The store secrets endpoint required an identity challenge. Credentials were instead synchronized through the official native integration connection workflow, temporarily scoped to Preview with a unique prefix. Only the two newly synchronized resource variables were read privately; branch-specific UPSTASH_REDIS_REST_URL and TOKEN were updated as sensitive variables. The temporary connection and its five variables were then removed. Comparison confirmed **203 unrelated records unchanged**, 205 final environment records, and no remaining automatic project connection. No legacy or Production secret was decrypted. Secret rotation must therefore be propagated manually to these branch variables.

Validation:

- New Redis PING passed.
- The real application limiter shared its counter across fresh module instances, allowed attempts 1–3, rejected attempt 4 and returned a positive retry <=600 seconds. The UUID test bucket was cleaned up; no real login bucket was modified by this check.
- Real Development Auth session was obtained using an administrative, unmailed QA magic link, without changing the existing password. The admin key was excluded from the Next runtime. Tokens stayed in memory.
- Isolated Next on 3300 passed confirmed identity, 900-second JWT, refresh, anonymous denial, login/logout CSRF, all seven sections, HttpOnly/SameSite=Lax cookies, inaccessible cookies from JavaScript, retired API 410, logout/cookie removal and revoked refresh after logout. The QA server was stopped. Global logout revoked this account's Development refresh sessions.
- Password sign-in, natural expiration, HTTPS Secure-cookie behavior and a second real identity remain unverified. The existing simulator E2E tests do not replace those checks.

Evidence: `/tmp/pledgeoff-preview-redis-sync-result.json`, `/tmp/pledgeoff-preview-redis-integration.log`, `/tmp/pledgeoff-real-auth-results.log`. The temporary Redis integration test was moved outside the copied test tree after execution. New resource credentials are private in `/tmp/pledgeoff-preview-redis-runtime.json` (0600), never in Git or logs.

No commit/push/deploy, DNS change or Production mutation. Next action: obtain the separate publication approval for the validated local checkpoint and a new Preview; then complete password/HTTPS validation. The sections below retain historical context and are superseded by this current state.

## Latest: identity mapped; Upstash terms require browser action

The user supplied the account email. Its existing Development identity is confirmed, has no MFA factors or ban, and remains unchanged. No password reset, account creation or email delivery occurred. Preview branch variables PRIVATE_TERMINAL_USER_ID / EMAIL / ORIGIN were created successfully, raising branch-specific records to 57. The exact origin was confirmed from the existing deployment alias: `https://pledgeoff-git-feature-private-terminal-pledgeoff.vercel.app`.

Marketplace discovery identified `upstash/upstash-kv` and a `free` billing plan requiring no payment method. Attempted creation of `pledgeoff-private-preview` with primaryRegion=fra1, autoUpgrade=false, prodPack=false, eviction=false, no project connection and no env pull. The CLI returned **action_required**: accept marketplace terms in the browser before installation can finish. Resource creation is not confirmed; do not claim Redis is provisioned.

User action URL provided by Vercel: https://vercel.com/pledgeoff/~/integrations/accept-terms/upstash?source=cli . This requirement comes from the platform, not a local approval rule. After acceptance, inspect installed integration/resources, then resume the prepared Free-plan creation via `/tmp/pledgeoff-create-preview-redis.py`; do not blindly retry on an uncertain result or connect Production. The private CLI response is `/tmp/pledgeoff-preview-redis-create-result.json` (0600).

Only after successful provisioning should its credentials replace the branch's empty Redis overrides. Identity exists but password login/refresh/logout integration validation and a new deployment are still outstanding. No password or token has been printed or committed.

## Latest execution — supersedes the initial access limitations below

- Credentials found in `/home/bh/Workspace/Work/Projects/pledgeoff-cto/.env.local` and `/home/bh/Workspace/Work/Projects/PledgeOFF/apps/web/.env.local`. Management tokens were read in memory and never printed or copied into Git. Both files point to Supabase Development; Upstash URL/token are empty in both.
- Supabase management access works using the authorized local token. Confirmed Development `INACTIVE`, organization `mdwhfioemanjsdqctzgv`, plan `free`; GET restore metadata supplies an eligible version. Production was only identified in project metadata; no Production writes were made.
- Initial Auth PATCH requests were rejected with HTTP 400 `Project is paused.` No configuration changed in those requests.
- POST Development restore returned HTTP 200; restoration completed at **ACTIVE_HEALTHY**. `/tmp/pledgeoff-finish-development.py` completed successfully (session 9525, exit 0), then applied and read back the Auth restrictions. No users were created.
- **Applied and verified Auth restrictions**: disable signup, Google/GitHub and anonymous users; Site URL `http://localhost:3000`; empty extra redirect allowlist; JWT lifetime 900 seconds; refresh rotation enabled. All Auth hooks were confirmed disabled. Before-state subset: `/tmp/pledgeoff-development-auth-before.json`.
- A direct Vercel API metadata read resolved the connector truncation: **148 records**, no pagination. Metadata-only inventory: `/tmp/pledgeoff-preview-env-metadata.json`.
- Created **54 branch-scoped encrypted variables** for `preview` / `feature/private-terminal`: Development Supabase URL + anon key, 51 empty overrides of inherited legacy settings, and `LOG_LEVEL=info`. This also empties inherited service-role/DB credentials and Production Redis settings on this branch. The secrets remain intact for their other original consumers.
- The write/readback comparison confirmed all 148 pre-existing Vercel records unchanged after creation. LOG_LEVEL was then corrected only on the newly created branch record (`B1czHRSKdfo4uAHY`) after the minimal build rejected an empty level.
- No private Auth identity has been provisioned, no terminal mapping/origin has been published, and Redis remains unconfigured on the branch. A deployment at this point must fail closed for login.
- The user has been asked for an enrollment email and for separate non-production Upstash credentials/resource. Neither is available yet. Do not copy the shared Production Redis credential as a shortcut.
- First minimal-config build failed because LOG_LEVEL was empty. The corrected localhost-only build with LOG_LEVEL=info **passed**, exit 0, 35.287 seconds: `/tmp/pledgeoff-preview-minimal-build.log`. No real keys were used for that build.
- Public Development Auth settings returned HTTP 200; only email remains enabled. Direct signup returned **422 / signup_disabled**. The verification initially expected 400/403; after correcting its HTTP-status expectation, it passed with the exact signup_disabled error. No identity was provisioned. Verification script: `/tmp/pledgeoff-verify-development-auth.py`.
- No commit, push, deployment, plan upgrade, paid resource creation or DNS change. Latest Vercel deployment remains `dpl_Ez3fZ1Z1ujWFSV7PuzhqZ7HEH35C`. DEMO remains on its separate local workspace; final login page check HTTP 200.

The following sections retain the initial plan/history; current remote state is recorded above.

## Target and access

- Vercel project: `pledgeoff`, `prj_7wpY51T1Nm1xdDqfOxmZdsIHLVsx`.
- Vercel team: `team_XjAUcND8BRy2XW9lnVRvpP3r`.
- Git branch: `feature/private-terminal`.
- Supabase Development: `vayqlprmwtvwqfxdfygl`; API URL confirmed through the Development connection: `https://vayqlprmwtvwqfxdfygl.supabase.co`.
- The Supabase management connection rejected `get_project` with a permission error. The project's current status, restoration eligibility, organization plan and cost could not be reconfirmed. The older audit's INACTIVE/Free findings are historical, not a current verification.
- Vercel metadata remains accessible. The existing Preview checkpoint is still READY; no updated Preview has been deployed.

## Prepared local change

`turbo.json` now declares `PRIVATE_TERMINAL_USER_ID`, `PRIVATE_TERMINAL_EMAIL` and `PRIVATE_TERMINAL_ORIGIN` as build environment inputs. A Turbo dry-run with fictitious values confirmed that changing each variable changes the web build cache hash. This prevents reuse of build output for a different terminal identity/origin and allows these variables through Turbo's strict build environment.

## Proposed Preview configuration

Apply terminal settings to the `preview` target and `feature/private-terminal` branch only. Verify inherited settings as well as branch overrides before deploying.

| Variable | Required source |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Development project URL above |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Development anon key or supported publishable key, retrieved securely |
| PRIVATE_TERMINAL_USER_ID | UUID of the confirmed, privately provisioned Development Auth user |
| PRIVATE_TERMINAL_EMAIL | Matching Development Auth email, server-only |
| PRIVATE_TERMINAL_ORIGIN | Exact HTTPS origin used for this Preview's login/logout |
| UPSTASH_REDIS_REST_URL | Separate non-production Redis resource |
| UPSTASH_REDIS_REST_TOKEN | Credential for that separate resource, transferred securely |

The stable Preview hostname must be confirmed before setting the origin. Other deployment hostnames will fail Origin checks; do not widen the origin policy as a shortcut. Local simulator identities/keys/passwords must not be copied to Vercel.

The terminal does not need service-role/DB credentials, exchange keys, LLM, GitHub, billing, email or legacy webhook/cron secrets. Before removing inherited legacy Preview settings, inventory the entire environment and its other branch consumers. Preserve Production and unrelated staging behavior. Never delete a multi-target record wholesale: retain all non-Preview targets. Branch overrides alone do not remove inherited unrelated secret names.

## Metadata inventory limitation

`filter_project_envs(decrypt=false)` returned a server-truncated general inventory (`truncated=true`, 48 omitted array items, also redacted strings). It is insufficient for a complete removal/change set. The branch filter returned an empty list; this does not establish absence of inherited global Preview settings. No values were decrypted and no records were changed. Obtain a complete supported metadata export/list before cleanup.

## Development Auth sequence

1. Restore management access and reconfirm current project status, restoration eligibility and cost. Obtain confirmation for any new cost before proceeding.
2. Restore Development if needed, then inspect existing Auth hooks and configuration.
3. Disable public signup, anonymous enrollment and unused OAuth providers. Restrict Site URL and recovery/enrollment redirects to the intended development flow, preserving refresh-token rotation. No MFA is requested for this phase.
4. Provision a confirmed identity privately and establish the server-only UUID/email mapping. Set/reset its password through a secure enrollment process, never chat/Git. Do not use SQL to manipulate Auth passwords.
5. Validate real Auth locally, including authorized/unauthorized users, refresh/expiration, logout, CSRF and cookies. Then configure and validate Preview with its separate rate limiter.
6. A checkpoint/push/deploy is still a distinct publication step. Never promote, merge to main or change Production as part of this preparation.

## Outstanding input/access

- Supabase management access is resolved through the user-authorized local token. Use the local credential loader without printing credentials; the management connector itself still has its original permission limitation.
- A separate non-production Upstash resource and secure credential transfer are needed; no Upstash management connector is available in this session.
- The user's enrollment email and exact Preview origin remain to be established before identity provisioning.

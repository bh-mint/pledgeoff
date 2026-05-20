# PledgeOFF — Runbook incidente

## Health check
```
GET https://pledgeoff.com/api/health
→ { status: 'ok', db: 'ok', latencyMs: N, ts: '...' }
→ 503 dacă DB e down
```

---

## Scenariu 1 — Prod e down complet

1. Verifică `https://pledgeoff.com/api/health`
2. Verifică Vercel dashboard → deployments → ultimul deployment
3. Dacă deployment eșuat → **Instant rollback în Vercel:**
   - Vercel dashboard → Deployments → click pe ultimul deployment care funcționa → "Redeploy"
4. Dacă deployment ok dar site down → verifică Supabase prod dashboard → `gphupxlfmeokquvyxqfw`
5. Dacă Supabase down → aștepți (nu poți face nimic, e infrastructura lor)

---

## Scenariu 2 — Migrație eșuată pe prod

1. Identifică migrația care a eșuat (`supabase db push` output sau logs)
2. Rulează `down.sql` corespunzător (dacă există în `infra/supabase/migrations/`)
3. Dacă nu există `down.sql` → scrie manual SQL de revert bazat pe ce a făcut migrația
4. Aplică via MCP `supabase-prod-write` → `execute_sql`
5. Marchează migrația ca revertită:
   ```sql
   DELETE FROM supabase_migrations.schema_migrations WHERE version = '0XXX';
   ```

---

## Scenariu 3 — Stripe webhook nu procesează

1. Verifică Vercel logs → `/api/webhooks/stripe` → erori recente
2. Verifică Stripe dashboard → Webhooks → events failed
3. Stripe retrimite automat timp de 3 zile — nu panica
4. Dacă eroarea e în cod → fix + deploy → Stripe va retrimite evenimentele eșuate
5. Dacă eroarea e `STRIPE_WEBHOOK_SECRET` greșit → verifică Vercel env vars

---

## Scenariu 4 — Outbox blocat (ideas fără verdict)

1. Verifică outbox:
   ```sql
   SELECT count(*) FROM outbox WHERE processed_at IS NULL;
   ```
2. Dacă > 0 și nu scade → verifică Vercel cron logs (`/api/cron/outbox`)
3. Cron rulează la `* * * * *` — dacă nu apare în logs → cron e mort
4. Fix: redeploy pe Vercel (cron-urile se reinițializează)
5. Dacă events sunt blocate cu erori repetate → verifică `error` column în outbox

---

## Scenariu 5 — Billing: user plătit apare ca Free

1. Verifică în Supabase prod:
   ```sql
   SELECT plan, status FROM subscriptions WHERE user_id = 'UUID';
   ```
2. Verifică în Stripe dashboard că subscription e `active`
3. Dacă Stripe active dar DB = free → webhook `customer.subscription.updated` nu a ajuns
   - Stripe dashboard → Webhooks → găsește evenimentul → "Resend"
4. Dacă nu rezolvă → update manual:
   ```sql
   UPDATE subscriptions SET plan = 'pro', status = 'active' WHERE user_id = 'UUID';
   ```
   + notifică userul

---

## Referințe rapide

| Resursa | URL |
|---|---|
| Vercel prod | https://vercel.com/bh-mint/pledgeoff |
| Supabase prod | https://supabase.com/dashboard/project/gphupxlfmeokquvyxqfw |
| Supabase dev | https://supabase.com/dashboard/project/vayqlprmwtvwqfxdfygl |
| Stripe dashboard | https://dashboard.stripe.com |
| Sentry | https://sentry.io |
| Axiom logs | https://app.axiom.co |

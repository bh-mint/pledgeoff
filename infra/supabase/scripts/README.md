# Supabase Migrations — Convenție

## Creare migrație nouă

ÎNTOTDEAUNA prin CLI:

```bash
supabase migration new <name>
```

Generează automat: `YYYYMMDDHHMMSS_name.sql` în `infra/supabase/migrations/`.

## Aplicare migrații

```bash
# Dev (linked by default)
supabase db push --linked --dry-run   # verifică ce urmează să fie aplicat
supabase db push --linked             # aplică efectiv

# Prod — link mai întâi
supabase link --project-ref gphupxlfmeokquvyxqfw
supabase db push --linked --dry-run
supabase db push --linked
supabase link --project-ref vayqlprmwtvwqfxdfygl  # revino la dev
```

## NICIODATĂ

- Nu crea fișiere migration manual cu nume numeric (`0047_...`)
- Nu aplica SQL direct via MCP `execute_sql` fără să înregistrezi în `schema_migrations`
- Nu rula `db push` fără `--dry-run` prima dată pe prod

## Referință proiecte

| Env | Project ref | Supabase dashboard |
|-----|------------|-------------------|
| Dev | `vayqlprmwtvwqfxdfygl` | PledgeOFF - Development |
| Prod | `gphupxlfmeokquvyxqfw` | PledgeOFF - Production |

## Repair history

Dacă `schema_migrations` devine din nou inconsistentă, folosește:
`infra/supabase/scripts/repair-migration-history.sql`

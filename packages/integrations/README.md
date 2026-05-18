# Module: integrations (M6 — Integration Layer)

## Status: NOT BUILT — Tier 2+

This package is a skeleton. No implementation exists yet.
It will be built when the first paying customer triggers the Tier 2 threshold.

## Purpose
Connect to external SaaS tools beyond Reddit/GitHub to enrich the signal surface.

## Owns
- Tables: none (Tier 1)
- Code paths: `src/` (empty — Tier 2+)

## Ports consumed
- `ISourceAdapter` — same port as M1 adapters (packages/adapters/src/sources/)

## Events published
- none (signals flow through M1 → M3, not directly from integrations)

## Tier 2 scope
- Slack adapter — read messages from designated channels for product feedback
- Notion adapter — read product docs / specs for context
- Stripe adapter (read-only) — subscription + churn data for signal enrichment

## Tier 3 evolution
- Salesforce, HubSpot, Linear, Jira, Intercom, Zendesk, GA, Mixpanel
- OAuth-based per-tenant connections
- Per-source rate limiting and quotas

## Architectural rule
Each integration implements `ISourceAdapter` (packages/core/src/ports/).
M1 (Ingestion) calls all registered adapters — no special cases per source.

## Failure modes
- Not applicable in Tier 1 (no code to fail)

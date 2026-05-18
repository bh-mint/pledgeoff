# Module: contracts

## Purpose
Shared event schemas and Zod validators used across packages. Single source of truth for all domain event shapes — prevents schema drift between publishers and consumers.

## Owns
- Tables: none
- Code paths: `src/events/`, `src/schemas/`

## Ports consumed
- none

## Events published
- Defines schemas for: `idea.created.v1`, `signals.fetched.v1`, `decision.ready.v1`

## Events consumed
- none (schema definitions only — no runtime logic)

## Tier 1 scope
- All three versioned event schemas fully defined with Zod

## Tier 2/3 evolution
- Add new event versions (`.v2`) when schema changes are needed — never mutate existing versioned schemas
- Extract to a schema registry if event count exceeds ~20

## Failure modes
- Zod validation at publish time — malformed events are rejected before entering the outbox

# PledgeOFF — build conventions

PledgeOFF is a decision-intelligence product with an editorial, print-inspired look:
cream paper background, ink text, serif display type, mono labels. Verdicts are
color-coded: GO = green, PIVOT = amber, KILL = red.

## Setup

No provider is required — design tokens are global CSS custom properties defined in
`styles.css`. Wrap the app in `ToastProvider` only if you call `useToast()` below it.
Two brand fonts ship with the bundle and are already wired: **Bitter** (serif — display,
headings, big numbers) and **Chivo Mono** (labels, eyebrows, buttons, metadata).

## Styling idiom: CSS tokens via `var(--*)` + Tailwind utilities

Style your own layout glue with inline styles or Tailwind classes that reference these
tokens (all defined in `styles.css`):

| Token | Use |
|---|---|
| `--bg` `--surface` `--surface-2` | page background, cards, raised panels |
| `--ink` `--dim` `--faint` | primary / secondary / tertiary text |
| `--t1` `--t2` `--t3` | text emphasis scale used across the app |
| `--go` `--pivot` `--kill` | verdict semantics: positive / caution / negative |
| `--accent` `--validated` `--caution` | highlight, success-ish, warning-ish |
| `--line` `--line-soft` `--border` | hairlines and borders |
| `--font-bitter` `--font-chivo-mono` | font stacks (already loaded) |

Reusable app classes that ship in the CSS: `.mono` (Chivo Mono utility), `.eye`
(uppercase mono eyebrow label), `.btn-g` (ghost button), `.w-bleed` (content column),
`.cta-band` (dark full-width CTA section), `.faq-item`/`.faq-q`/`.faq-a` (accordion).

Typography rules: headings and big numbers use `fontFamily: "var(--font-bitter), serif"`
with tight letter-spacing; labels/eyebrows use `var(--font-chivo-mono)` at 10–11px,
uppercase, `letterSpacing: "0.08em"+`. Body text is 13–14px on `--dim`.

## Where the truth lives

Read `styles.css` (and its imports) for every token and utility before inventing your
own. Each component's API is its `<Name>.d.ts`; usage examples are in `<Name>.prompt.md`.

## Idiomatic snippet

```tsx
<div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 20 }}>
  <span className="eye" style={{ marginBottom: 8 }}>Verdict</span>
  <DecisionCard
    ideaId="b56363fb-8b86-d011-b42d-00cf4fc964aa"
    decision={{
      id: "6f9619ff-8b86-d011-b42d-00cf4fc964ff",
      ideaId: "b56363fb-8b86-d011-b42d-00cf4fc964aa",
      verdict: "GO", confidence: 0.84, score: 79, signalIds: [],
      dimensions: [
        { name: "Demand", weight: 0.4, score: 82 },
        { name: "Competition", weight: 0.25, score: 71 },
        { name: "Effort", weight: 0.2, score: 78 },
        { name: "Timing", weight: 0.15, score: 85 },
      ],
      reasoning: "Strong, recent demand signals; founder-priced wedge is viable.",
      createdAt: "2026-06-20T09:00:00.000Z",
    }}
  />
</div>
```

Charts (`DimensionRadarChart`, `RevenueAreaChart`, `ScoreWaterfallChart`,
`CompetitorPositioningMap`) size to their container — give them a fixed-width wrapper
(420–560px works well).

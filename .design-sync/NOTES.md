# design-sync NOTES — PledgeOFF

- Monorepo Next.js app, NOT a packaged DS: no dist. Bundle entry is the committed barrel
  `apps/web/.ds-assets/ds-entry.tsx` (passed via `--entry`); passing a component file as
  `--entry` bundles only that file — always use the barrel.
- `apps/web/.ds-assets/ds-process-shim.ts` MUST stay the first import of the barrel:
  Next runtime modules read `process.env.*` beyond NODE_ENV (browser crash without it).
  It also sets `NEXT_PUBLIC_PH_URL` so PHBanner (env-gated, returns null without it) renders.
- CSS: Tailwind v4, CSS-first config — `cssEntry` points at `apps/web/.ds-assets/compiled.css`,
  a copy of the Next build's compiled chunk (gitignored). **Re-sync steps:** `pnpm build`, then
  re-copy `.next/static/chunks/<biggest>.css` → `.ds-assets/compiled.css` AND re-append the
  `:root{--font-bitter:…}` block (next/font defines the font vars in module classes, not :root).
  Fonts: `.ds-assets/fonts.css` = the small font chunk with `../media/` → `./media/` rewritten;
  woff2 copies in `.ds-assets/media/` (gitignored) from `.next/static/media/`.
- `UpgradeModalProvider` deliberately EXCLUDED: it imports CheckoutModal which calls
  `loadStripe("")` at module scope → a global IntegrationError pageerror that flags every
  preview bad. Re-adding it requires guarding that loadStripe call first.
- `.d.ts` auto-extraction yields only index signatures in synth-entry mode — all real prop
  contracts live in `cfg.dtsPropsFor` (hand-written from the source Props interfaces).
  Keep them in sync when component props change.
- Playwright: cached chromium build 1223 ↔ playwright@1.60.0 (repo pins 1.61.0 = build 1228
  which is NOT cached). `.ds-sync` installs playwright@1.60.0.
- npm in `.ds-sync` warns `allow-scripts` but esbuild binary ships fine.

## Known render warns
- Animated components screenshot mid-animation: DecisionCard score count, StatNumber count,
  DimensionRadarChart polygon growth (900ms). Live cards settle; grading noted this.
- InfoTooltip: tooltip body is hover-only — static capture shows only the trigger. By design.
- NotificationBell / ThemeToggle: legitimately small (icon-sized) — earlier RENDER_BLANK
  flags resolved by authored previews with context shells.

## Re-sync risks
- `compiled.css` staleness: token/utility changes in the app don't reach the bundle until the
  Next build re-runs and the copy step above is repeated. The `:root` font-var append is manual.
- Preview data is inlined (verdicts, simulations, competitors) — schema changes in
  `@pledgeoff/core` domain types will typecheck-break preview compiles; fix the previews.
- `dtsPropsFor` is hand-maintained: component prop changes silently drift until re-checked.
- next/link components (Footer, PublicNav) render as plain anchors outside a Next router —
  fine for cards; navigation is inert in previews.

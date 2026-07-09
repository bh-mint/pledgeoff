// Browser shim: Next.js runtime modules read process.env.* keys beyond
// NODE_ENV (esbuild only defines that one). Must be the FIRST import of the
// design-sync bundle entry so it runs before any next/* module initializes.
const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };
if (!g.process) g.process = { env: { NODE_ENV: "development" } };
// PHBanner renders only when this is set; give previews and designs a real URL.
g.process.env.NEXT_PUBLIC_PH_URL ??= "https://www.producthunt.com/posts/pledgeoff";

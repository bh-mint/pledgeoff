export default function NewIdeaLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-2xl px-4 animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded" style={{ background: "var(--surface)" }} />
          <div className="h-8 w-64 rounded" style={{ background: "var(--surface)" }} />
        </div>
        <div className="h-12 rounded-lg" style={{ background: "var(--surface)" }} />
        <div className="h-28 rounded-lg" style={{ background: "var(--surface)" }} />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 rounded" style={{ background: "var(--surface)" }} />
          ))}
        </div>
        <div className="h-11 w-48 rounded-lg" style={{ background: "var(--surface)" }} />
      </div>
    </div>
  );
}

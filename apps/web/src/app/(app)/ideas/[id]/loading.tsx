export default function IdeaLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Back link + title */}
          <div className="space-y-3">
            <div className="h-4 w-32 rounded" style={{ background: "var(--surface)" }} />
            <div className="h-8 w-2/3 rounded" style={{ background: "var(--surface)" }} />
          </div>
          {/* Decision card skeleton */}
          <div className="h-48 rounded-lg" style={{ background: "var(--surface)" }} />
          {/* Tool tabs */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-28 rounded" style={{ background: "var(--surface)" }} />
            ))}
          </div>
          {/* Content */}
          <div className="h-64 rounded-lg" style={{ background: "var(--surface)" }} />
        </div>
      </div>
    </div>
  );
}

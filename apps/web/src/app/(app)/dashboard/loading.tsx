export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Masthead */}
          <div className="space-y-2">
            <div className="h-3 w-40 rounded" style={{ background: "var(--surface)" }} />
            <div className="h-8 w-72 rounded" style={{ background: "var(--surface)" }} />
          </div>
          {/* Attention grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg" style={{ background: "var(--surface)" }} />
            ))}
          </div>
          {/* Ledger — 5 cells */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-lg" style={{ background: "var(--surface)" }} />
            ))}
          </div>
          {/* Case rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-lg" style={{ background: "var(--surface)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg" style={{ background: "var(--surface)" }} />
            ))}
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-24 rounded" style={{ background: "var(--surface)" }} />
            ))}
          </div>
          {/* Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-lg" style={{ background: "var(--surface)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

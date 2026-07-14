export default function SettingsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-360 mx-auto px-4 sm:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-12 gap-10 mt-6">
            {/* Side nav skeleton */}
            <div className="hidden md:block col-span-2 space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-8 rounded" style={{ background: "var(--surface)" }} />
              ))}
            </div>
            {/* Content skeleton */}
            <div className="col-span-12 md:col-span-10 space-y-6">
              <div className="h-6 w-48 rounded" style={{ background: "var(--surface)" }} />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg" style={{ background: "var(--surface)" }} />
                ))}
              </div>
              <div className="h-48 rounded-lg" style={{ background: "var(--surface)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

export function ReportActions({ canExport }: { canExport: boolean }) {
  return (
    <button
      className={`btn-xs${canExport ? " p" : ""}`}
      onClick={() => {
        if (canExport) window.print();
      }}
      disabled={!canExport}
      style={!canExport ? { opacity: 0.38, cursor: "not-allowed" } : undefined}
    >
      {canExport ? "Export PDF →" : "Export PDF"}
    </button>
  );
}

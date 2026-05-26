"use client";

export function ReportActions() {
  return (
    <div className="no-print" style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "flex-end" }}>
      <button
        onClick={() => window.history.back()}
        style={{ fontSize: 13, padding: "8px 16px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#555" }}
      >
        ← Back
      </button>
      <button
        onClick={() => window.print()}
        style={{ fontSize: 13, padding: "8px 20px", border: "none", borderRadius: 6, background: "#111", color: "#fff", cursor: "pointer", fontWeight: 600 }}
      >
        Print / Save PDF
      </button>
    </div>
  );
}

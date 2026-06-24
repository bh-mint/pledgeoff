import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Bulletin dark-mode tokens (dark bg pops better on social feeds)
const BG   = "#0F0D0A";
const INK  = "#F3EFE3";
const DIM  = "#8C7B6B";
const FAINT = "#4A3F35";
const LINE = "#2A231D";

const VERDICT_COLORS: Record<string, string> = {
  GO:    "#3AC47A",
  KILL:  "#E05757",
  PIVOT: "#E08C2A",
};

const VERDICT_DESC: Record<string, string> = {
  GO:    "Strong signal. Build it.",
  KILL:  "Weak signal. Don't build it.",
  PIVOT: "Mixed signal. Change direction.",
};

const TAG_LABELS: Record<string, string> = {
  "idea-validation": "IDEA VALIDATION",
  "product-decisions": "PRODUCT DECISIONS",
  "founder": "FOUNDER MINDSET",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "blog";

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (type === "home") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: BG,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            fontFamily: "serif",
          }}
        >
          {/* Top */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
              <span style={{ color: INK }}>Pledge</span>
              <span style={{ color: "#3AC47A" }}>OFF</span>
            </span>
            <span style={{ color: FAINT, fontSize: "14px" }}>·</span>
            <span style={{ color: DIM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", fontFamily: "monospace" }}>
              DECISION INTELLIGENCE
            </span>
          </div>

          {/* Main */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
              {["GO", "KILL", "PIVOT"].map((v) => (
                <span
                  key={v}
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: VERDICT_COLORS[v],
                    letterSpacing: "0.1em",
                    fontFamily: "monospace",
                    border: `1px solid ${VERDICT_COLORS[v]}44`,
                    padding: "3px 10px",
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
            <p
              style={{
                fontSize: "64px",
                fontWeight: 700,
                color: INK,
                lineHeight: 1.05,
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Know if your idea<br />is worth building.
            </p>
            <p style={{ fontSize: "22px", color: DIM, margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>
              Before you build it.
            </p>
          </div>

          {/* Bottom */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "7px", height: "7px", background: "#3AC47A", display: "flex" }} />
              <span style={{ fontSize: "13px", color: DIM, letterSpacing: "0.06em", fontFamily: "monospace" }}>
                pledgeoff.com · validate in under 60s · no credit card
              </span>
            </div>
            <span style={{ fontSize: "12px", color: FAINT, fontFamily: "monospace", letterSpacing: "0.08em" }}>
              FIELD INTELLIGENCE FOR FOUNDERS
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ── VERDICT ───────────────────────────────────────────────────────────────
  if (type === "verdict") {
    const verdict = searchParams.get("verdict") ?? "GO";
    const score   = searchParams.get("score") ?? "0";
    const text    = searchParams.get("text") ?? "";
    const color   = VERDICT_COLORS[verdict] ?? "#3AC47A";
    const desc    = VERDICT_DESC[verdict] ?? "";
    const truncated = text.length > 90 ? text.slice(0, 87) + "…" : text;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: BG,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            fontFamily: "serif",
          }}
        >
          {/* Top */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
              <span style={{ color: INK }}>Pledge</span>
              <span style={{ color: "#3AC47A" }}>OFF</span>
            </span>
            <span style={{ color: FAINT, fontSize: "14px" }}>·</span>
            <span style={{ color: DIM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", fontFamily: "monospace" }}>
              IDEA VERDICT
            </span>
          </div>

          {/* Main */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {truncated && (
              <p style={{ fontSize: "17px", color: DIM, margin: 0, lineHeight: 1.5, borderLeft: `2px solid ${FAINT}`, paddingLeft: "16px" }}>
                {truncated}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "28px" }}>
              <span
                style={{
                  fontSize: "148px",
                  fontWeight: 700,
                  color,
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  fontFamily: "monospace",
                }}
              >
                {score}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "10px" }}>
                <span
                  style={{
                    fontSize: "56px",
                    fontWeight: 700,
                    color,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {verdict}
                </span>
                <span style={{ fontSize: "16px", color: DIM, fontStyle: "italic" }}>{desc}</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "7px", height: "7px", background: color, display: "flex" }} />
            <span style={{ fontSize: "13px", color: DIM, letterSpacing: "0.06em", fontFamily: "monospace" }}>
              pledgeoff.com · validate your idea in under 60s
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ── BLOG ──────────────────────────────────────────────────────────────────
  const title   = searchParams.get("title") ?? "PledgeOFF Blog";
  const tag     = searchParams.get("tag") ?? "";
  const tagLabel = TAG_LABELS[tag] ?? "";
  const excerpt = searchParams.get("excerpt") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: BG,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "serif",
          borderTop: "4px solid #3AC47A",
        }}
      >
        {/* Top */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
            <span style={{ color: INK }}>Pledge</span>
            <span style={{ color: "#3AC47A" }}>OFF</span>
          </span>
          <span style={{ color: FAINT, fontSize: "14px" }}>·</span>
          <span style={{ color: "#3AC47A", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", fontFamily: "monospace" }}>
            BULLETIN
          </span>
        </div>

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tagLabel && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: DIM,
                letterSpacing: "0.14em",
                fontFamily: "monospace",
                border: `1px solid ${LINE}`,
                padding: "3px 10px",
                alignSelf: "flex-start",
              }}
            >
              {tagLabel}
            </span>
          )}
          <p
            style={{
              fontSize: title.length > 55 ? "40px" : "52px",
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </p>
          {excerpt && (
            <p
              style={{
                fontSize: "18px",
                color: DIM,
                lineHeight: 1.5,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {excerpt.length > 130 ? excerpt.slice(0, 127) + "…" : excerpt}
            </p>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "7px", height: "7px", background: "#3AC47A", display: "flex" }} />
          <span style={{ fontSize: "13px", color: DIM, letterSpacing: "0.06em", fontFamily: "monospace" }}>
            pledgeoff.com/blog · field notes on validation & timing
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

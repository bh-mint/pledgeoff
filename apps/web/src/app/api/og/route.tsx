import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TAG_LABELS: Record<string, string> = {
  "idea-validation": "IDEA VALIDATION",
  "product-decisions": "PRODUCT DECISIONS",
  "founder": "FOUNDER MINDSET",
};

const VERDICT_COLORS: Record<string, string> = {
  GO:    "#7DD66B",
  KILL:  "#FF5555",
  PIVOT: "#F59E0B",
};

const VERDICT_DESC: Record<string, string> = {
  GO:    "Strong signal. Build it.",
  KILL:  "Weak signal. Don't build it.",
  PIVOT: "Mixed signal. Change direction.",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "blog";

  if (type === "verdict") {
    const verdict = searchParams.get("verdict") ?? "GO";
    const score = searchParams.get("score") ?? "0";
    const text = searchParams.get("text") ?? "";
    const color = VERDICT_COLORS[verdict] ?? "#7DD66B";
    const desc = VERDICT_DESC[verdict] ?? "";
    const truncated = text.length > 80 ? text.slice(0, 77) + "…" : text;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            fontFamily: "sans-serif",
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
              <span style={{ color: "#f5f5f5" }}>Pledge</span>
              <span style={{ color: "#D6FF3D" }}>OFF</span>
            </span>
            <span style={{ color: "#404040", fontSize: "14px" }}>·</span>
            <span style={{ color: "#737373", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>
              IDEA VERDICT
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {truncated && (
              <p style={{ fontSize: "18px", color: "#737373", margin: 0, lineHeight: 1.4 }}>
                {truncated}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "24px" }}>
              <span style={{ fontSize: "140px", fontWeight: 900, color, lineHeight: 0.85, letterSpacing: "-0.04em" }}>
                {score}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "8px" }}>
                <span style={{ fontSize: "52px", fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {verdict}
                </span>
                <span style={{ fontSize: "16px", color: "#737373" }}>{desc}</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D6FF3D" }} />
            <span style={{ fontSize: "13px", color: "#737373", letterSpacing: "0.04em" }}>
              pledgeoff.com · validate your idea in under 60s
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const title = searchParams.get("title") ?? "PledgeOFF Blog";
  const tag = searchParams.get("tag") ?? "";
  const tagLabel = TAG_LABELS[tag] ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
            <span style={{ color: "#f5f5f5" }}>Pledge</span>
            <span style={{ color: "#D6FF3D" }}>OFF</span>
          </span>
          <span style={{ color: "#404040", fontSize: "14px" }}>·</span>
          <span style={{ color: "#caff47", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>
            BLOG
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tagLabel && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#737373",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {tagLabel}
            </span>
          )}
          <p
            style={{
              fontSize: title.length > 60 ? "42px" : "52px",
              fontWeight: 900,
              color: "#f5f5f5",
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </p>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#caff47",
            }}
          />
          <span style={{ fontSize: "13px", color: "#737373", letterSpacing: "0.04em" }}>
            pledgeoff.com/blog
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

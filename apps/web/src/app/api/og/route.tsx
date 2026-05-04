import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TAG_LABELS: Record<string, string> = {
  "idea-validation": "IDEA VALIDATION",
  "product-decisions": "PRODUCT DECISIONS",
  "founder": "FOUNDER MINDSET",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
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

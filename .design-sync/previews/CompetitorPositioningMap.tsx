import { CompetitorPositioningMap } from "@pledgeoff/web";

export const CrowdedMarket = () => (
  <div style={{ width: 560 }}>
    <CompetitorPositioningMap
      competitors={[
        { name: "Crayon", positioning: "Enterprise competitive intelligence platform", estimatedPrice: "$500/mo", targetSegment: "Enterprise product marketing", signals: ["Named in 4 discussions"], source: "knowledge" },
        { name: "Klue", positioning: "Compete-and-win platform for sales enablement", estimatedPrice: "$1000/mo", targetSegment: "Enterprise sales teams", signals: ["Mentioned in reviews"], source: "knowledge" },
        { name: "Visualping", positioning: "Simple page-change monitoring", estimatedPrice: "Free + $25/mo", targetSegment: "SMB and solo founders", signals: ["Recommended on Reddit"], source: "signal" },
        { name: "SimilarWeb", positioning: "Traffic intelligence and market research", estimatedPrice: "$125/mo", targetSegment: "Mixed — marketers and analysts", signals: ["Compared in a G2 review"], source: "signal" },
      ]}
    />
  </div>
);

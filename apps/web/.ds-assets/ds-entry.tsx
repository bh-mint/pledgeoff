// design-sync bundle entry — re-exports the components synced to Claude Design.
// Referenced by .design-sync/config.json via the converter's --entry flag.
import "./ds-process-shim";
export { DecisionCard } from "../src/components/DecisionCard";
export { InfoTooltip } from "../src/components/InfoTooltip";
export { StatNumber } from "../src/components/StatNumber";
export { ThemeToggle } from "../src/components/ThemeToggle";
export { ShareVerdictButton } from "../src/components/ShareVerdictButton";
export { ToastProvider } from "../src/components/ToastProvider";
export { PHBanner } from "../src/components/PHBanner";
export { NotificationBell } from "../src/components/NotificationBell";
export { OutcomeBanner } from "../src/components/OutcomeBanner";
export { OutcomeButton } from "../src/components/OutcomeButton";
export { FeedbackButtons } from "../src/components/FeedbackButtons";
export { ValidatingLoader } from "../src/components/ValidatingLoader";
export { Footer } from "../src/components/Footer";
export { PublicNav } from "../src/components/PublicNav";
export { SignalFeed } from "../src/components/SignalFeed";
export {
  DimensionRadarChart,
  RevenueAreaChart,
  ScoreWaterfallChart,
  CompetitorPositioningMap,
} from "../src/app/(app)/ideas/[id]/VerdictCharts";

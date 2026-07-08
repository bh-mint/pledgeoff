// Shared by HomeClient (visible accordion) and page.tsx (FAQPage JSON-LD).
// Google requires JSON-LD answers to match the visible text — edit here only.
export const HOME_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "How does PledgeOFF decide GO, KILL, or PIVOT?",
    a: "It fetches live market signals about your idea, scores the evidence across weighted dimensions, and returns a verdict with reasoning, a confidence level, and every source linked — so you can verify the evidence yourself.",
  },
  {
    q: "Where do the signals come from?",
    a: "Eight live sources: Reddit, GitHub, Hacker News, Dev.to, G2 & Capterra reviews, news coverage, job postings, and the wider web. The free plan reads Reddit and GitHub; paid plans read all eight.",
  },
  {
    q: "How long does a validation take?",
    a: "About 15 seconds from submitting your idea to a full GO / KILL / PIVOT verdict. Intelligence tools like ICP Analysis or Competitive Landscape run on demand afterwards.",
  },
  {
    q: "What do I get on the free plan?",
    a: "One validation per month with Reddit and GitHub signals, the full GO / KILL / PIVOT verdict, and a limited ICP analysis. No credit card required.",
  },
  {
    q: "Is the verdict really accurate?",
    a: "PledgeOFF doesn't predict the future — it surfaces real signals from Reddit, GitHub, HN, and more to show what the market is saying right now. Every source is linked so you can verify.",
  },
  {
    q: "What are the intelligence tools?",
    a: "Eleven tools you can run after a verdict — from ICP Analysis, Competitive Landscape, and Revenue Model to Battlecards, Interview Guides, and Transcript Analysis. Founder plan includes eight; Team and above gets all eleven.",
  },
];

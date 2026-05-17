"use client";

import { useState } from "react";
import Link from "next/link";

type Option = { label: string; score: number };
type Question = { text: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    text: "How long have you been sitting on this decision?",
    options: [
      { label: "Less than a week", score: 0 },
      { label: "1–4 weeks", score: 1 },
      { label: "1–3 months", score: 2 },
      { label: "More than 3 months", score: 3 },
    ],
  },
  {
    text: "What's the main reason you haven't decided yet?",
    options: [
      { label: "I need more information", score: 1 },
      { label: "I'm afraid of making the wrong call", score: 2 },
      { label: "The options feel equally uncertain", score: 2 },
      { label: "I don't know what outcome I'm optimizing for", score: 3 },
    ],
  },
  {
    text: "How reversible is this decision?",
    options: [
      { label: "Fully reversible — I can undo it", score: 0 },
      { label: "Mostly reversible with some cost", score: 1 },
      { label: "Hard to undo", score: 2 },
      { label: "Irreversible", score: 3 },
    ],
  },
  {
    text: "What happens if you delay another 30 days?",
    options: [
      { label: "Nothing significant", score: 0 },
      { label: "Minor opportunity cost", score: 1 },
      { label: "Real business impact", score: 2 },
      { label: "We miss a window that won't reopen", score: 3 },
    ],
  },
  {
    text: "How much data do you actually have?",
    options: [
      { label: "Plenty — I just haven't acted on it", score: 0 },
      { label: "Some — enough to make a reasonable call", score: 1 },
      { label: "Not enough — key unknowns remain", score: 2 },
      { label: "Very little — I'm mostly guessing", score: 3 },
    ],
  },
];

type Band = "high" | "medium" | "low";

type Result = {
  band: Band;
  score: number;
  label: string;
  summary: string;
  recommendations: string[];
};

function getResult(totalScore: number): Result {
  const score = Math.round((1 - totalScore / 15) * 100);

  if (totalScore <= 4) {
    return {
      band: "high",
      score,
      label: "High clarity",
      summary:
        "You have what you need. This is a decision, not a research project. The delay is psychological, not informational.",
      recommendations: [
        "Set a 48-hour deadline. Most decisions that feel complex become obvious under a real constraint.",
        "Write down the worst realistic outcome. If you can live with it, the decision is already made.",
        "Validate the one assumption you're most afraid of — with data, not gut feel.",
      ],
    };
  }

  if (totalScore <= 9) {
    return {
      band: "medium",
      score,
      label: "Moderate clarity",
      summary:
        "One unknown is blocking everything else. Identify it and eliminate it before anything else.",
      recommendations: [
        "Write down the single question whose answer would unlock the decision. Answer only that.",
        "Run a 1-week experiment instead of committing to the full path.",
        "Check if the market has already answered your key question — with real signals, not opinion.",
      ],
    };
  }

  return {
    band: "low",
    score,
    label: "Low clarity",
    summary:
      "You may have a framing problem, not a decision problem. The way the question is posed may be making it impossible to answer.",
    recommendations: [
      "Restate the goal from scratch. What does success actually look like in 6 months?",
      "Break it into two sub-decisions you can make independently, this week.",
      "Talk to 3 people who've faced a similar choice. Skip theory — get patterns.",
    ],
  };
}

const BAND_COLOR: Record<Band, string> = {
  high: "var(--validated)",
  medium: "var(--caution)",
  low: "var(--kill)",
};

export function DecisionClarityClient() {
  const [step, setStep] = useState<number>(0); // 0–4 = questions, 5 = results
  const [scores, setScores] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const isResults = step >= QUESTIONS.length;
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const result = isResults ? getResult(totalScore) : null;

  function handleSelect(optionIndex: number) {
    setSelected(optionIndex);
  }

  function handleNext() {
    if (selected === null) return;
    const newScores = [...scores, QUESTIONS[step].options[selected].score];
    setScores(newScores);
    setSelected(null);
    setStep(step + 1);
  }

  function handleRestart() {
    setStep(0);
    setScores([]);
    setSelected(null);
  }

  if (isResults && result) {
    return (
      <div
        className="rounded-lg p-8 border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Score */}
        <div className="text-center mb-8">
          <p
            className="mono text-[11px] uppercase tracking-[0.14em] mb-3"
            style={{ color: "var(--t3)" }}
          >
            Your clarity score
          </p>
          <p
            className="font-serif text-7xl font-bold mb-2 tabular-nums"
            style={{ color: BAND_COLOR[result.band] }}
          >
            {result.score}
          </p>
          <p
            className="mono text-[11px] uppercase tracking-[0.12em]"
            style={{ color: BAND_COLOR[result.band] }}
          >
            {result.label}
          </p>
        </div>

        {/* Summary */}
        <p
          className="text-sm leading-relaxed mb-8 text-center"
          style={{ color: "var(--t2)" }}
        >
          {result.summary}
        </p>

        {/* Recommendations */}
        <div className="mb-8">
          <p
            className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
            style={{ color: "var(--t3)" }}
          >
            3 next steps
          </p>
          <div className="flex flex-col gap-3">
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 rounded border"
                style={{
                  background: "var(--canvas)",
                  borderColor: "var(--border)",
                }}
              >
                <span
                  className="mono text-[11px] shrink-0 mt-0.5"
                  style={{ color: "var(--t3)" }}
                >
                  0{i + 1}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--t1)" }}>
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="rounded-lg p-5 border mb-6"
          style={{
            background: "var(--canvas)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm mb-1" style={{ color: "var(--t1)" }}>
            Want data-backed decisions?
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--t2)" }}>
            PledgeOFF validates your idea against real signals from Reddit, GitHub, and HN — so your next decision starts with evidence.
          </p>
          <Link
            href="/login"
            className="inline-block w-full text-center py-3 rounded font-medium text-sm mono uppercase tracking-[0.08em] transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Validate your idea free
          </Link>
        </div>

        <button
          onClick={handleRestart}
          className="w-full text-sm py-2 transition-colors"
          style={{ color: "var(--t3)" }}
        >
          Start over
        </button>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const progress = step / QUESTIONS.length;

  return (
    <div
      className="rounded-lg p-8 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span
            className="mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--t3)" }}
          >
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <span
            className="mono text-[10px]"
            style={{ color: "var(--t3)" }}
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div
          className="h-px w-full rounded"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-px rounded transition-all duration-300"
            style={{
              width: `${progress * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <p
        className="text-lg leading-snug mb-7"
        style={{ color: "var(--t1)" }}
      >
        {q.text}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2 mb-8">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className="w-full text-left px-4 py-3 rounded border text-sm transition-all"
              style={{
                background: isSelected ? "var(--accent)" : "var(--canvas)",
                borderColor: isSelected ? "var(--accent)" : "var(--border)",
                color: isSelected ? "var(--accent-fg)" : "var(--t1)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Next */}
      <button
        onClick={handleNext}
        disabled={selected === null}
        className="w-full py-3 rounded font-medium text-sm mono uppercase tracking-[0.08em] transition-opacity disabled:opacity-30"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {step === QUESTIONS.length - 1 ? "See my results" : "Next"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCountUp } from "@/lib/motion";

const QUESTIONS = [
  {
    q: "Can you explain your product's core value in one sentence?",
    opts: [
      { t: "Yes, clearly and simply.", s: 2 },
      { t: "Sort of — it takes a paragraph to get there.", s: 1 },
      { t: "Not yet. Still working it out.", s: 0 },
    ],
  },
  {
    q: "Who are your first ten customers?",
    opts: [
      { t: "I know specific people by name.", s: 2 },
      { t: "I know the type of person, but not anyone specific.", s: 1 },
      { t: "I haven't figured that out yet.", s: 0 },
    ],
  },
  {
    q: "What tells you this is a real problem?",
    opts: [
      { t: "I have talked to people who have it and they confirmed it.", s: 2 },
      { t: "I have seen it come up in forums, reviews, or comments.", s: 1 },
      { t: "A personal hunch — I have the problem myself.", s: 0 },
    ],
  },
  {
    q: "What do people do today instead of using your product?",
    opts: [
      { t: "There is a product they use and actively complain about.", s: 2 },
      { t: "There is a workaround — spreadsheets, a manual process.", s: 1 },
      { t: "I am not sure what they currently do.", s: 0 },
    ],
  },
  {
    q: "Why does this idea matter now, not in two years?",
    opts: [
      { t: "There is a specific window — new technology, regulation, or behavior shift.", s: 2 },
      { t: "It matters now. I just have not articulated why.", s: 1 },
      { t: "Timing is not really critical for this one.", s: 0 },
    ],
  },
] as const;

const LEVELS = [
  { min: 80, label: "Clear.", color: "var(--go)", desc: "You've done more pre-work than most. The premise is defined, the customer is identifiable, the evidence exists. Validate it now before the window narrows." },
  { min: 60, label: "Promising.", color: "var(--ink)", desc: "You're past the vague phase. You know what you're building and for whom. A verdict will tell you whether the market agrees." },
  { min: 30, label: "Forming.", color: "var(--pivot)", desc: "Real instincts here. A few gaps to close before you commit resources. A verdict would surface which gaps matter most." },
  { min: 0,  label: "Hazy.", color: "var(--faint)", desc: "You have an impulse, not yet a defined idea. That is not a bad place to start — it just means the work ahead is about sharpening the premise before validating the market." },
] as const;

type Screen = "quiz" | "result";

export function DecisionClarityClient() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>(Array(QUESTIONS.length).fill(undefined));
  const [screen, setScreen] = useState<Screen>("quiz");
  const [pct, setPct] = useState(0);

  const selected = answers[current];

  function select(i: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = i;
      return next;
    });
  }

  function next() {
    if (selected === undefined) return;
    if (current < QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      const raw = answers.reduce<number>((sum, a, i) => {
        if (a === undefined) return sum;
        return sum + QUESTIONS[i].opts[a].s;
      }, 0);
      setPct(Math.round((raw / (QUESTIONS.length * 2)) * 100));
      setScreen("result");
    }
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function reset() {
    setAnswers(Array(QUESTIONS.length).fill(undefined));
    setCurrent(0);
    setScreen("quiz");
    setPct(0);
  }

  const level = LEVELS.find((l) => pct >= l.min) ?? LEVELS[LEVELS.length - 1];
  const { value: displayScore } = useCountUp(pct, { duration: 900 });
  const [barPct, setBarPct] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBarPct(screen === "result" ? pct : 0));
    return () => cancelAnimationFrame(id);
  }, [screen, pct]);

  if (screen === "result") {
    return (
      <>
        <div className="quiz-prog">
          {QUESTIONS.map((_, i) => (
            <div key={i} className="quiz-dot done" />
          ))}
        </div>

        <div className="result-score" style={{ color: level.color }}>{displayScore}</div>
        <div className="mono" style={{ fontSize: "8.5px", letterSpacing: ".22em", textTransform: "uppercase", color: "var(--faint)", marginBottom: "16px" }}>
          Decision-Clarity Score
        </div>

        <div className="result-bar">
          <div className="result-fill" style={{ width: `${barPct}%` }} />
        </div>

        <div className="result-verdict">{level.label}</div>
        <p className="result-desc">{level.desc}</p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/ideas/new" className="btn-p">Validate this idea now &rarr;</Link>
          <button className="btn-g" onClick={reset}>Retake the quiz</button>
        </div>

        <p className="mono" style={{ fontSize: "8px", letterSpacing: ".08em", color: "var(--faint)", marginTop: "14px" }}>
          First validation free. No account required to try it.
        </p>
      </>
    );
  }

  const q = QUESTIONS[current];

  return (
    <>
      <div className="quiz-prog">
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`quiz-dot${i < current ? " done" : ""}`} />
        ))}
      </div>

      <div className="quiz-num">Question {current + 1} of {QUESTIONS.length}</div>
      <div className="quiz-q">{q.q}</div>

      <div className="quiz-opts">
        {q.opts.map((opt, i) => (
          <button
            key={i}
            className={`quiz-opt${selected === i ? " sel" : ""}`}
            onClick={() => select(i)}
          >
            {opt.t}
          </button>
        ))}
      </div>

      <div className="quiz-nav">
        <button
          className="btn-g"
          onClick={prev}
          style={{ visibility: current === 0 ? "hidden" : "visible" }}
        >
          &larr; Back
        </button>
        {selected !== undefined ? (
          <button className="btn-p" onClick={next}>
            {current === QUESTIONS.length - 1 ? "See my score" : "Next →"}
          </button>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

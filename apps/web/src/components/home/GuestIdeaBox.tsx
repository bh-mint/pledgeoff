"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGuestDraft } from "@/lib/guest-draft";

const MIN_CHARS = 10;
const MAX_CHARS = 2000;

/**
 * Homepage idea box for visitors without an account. The draft is saved in
 * the browser before navigation, so it survives the signup detour and
 * /ideas/new prefills it — the visitor never loses what they typed.
 */
export function GuestIdeaBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showErr, setShowErr] = useState(false);

  const submit = () => {
    if (text.trim().length < MIN_CHARS) {
      setShowErr(true);
      return;
    }
    saveGuestDraft(text.trim());
    // Logged-in users land straight on the form; guests go through
    // /login?next=/ideas/new via the middleware — the draft waits for them.
    router.push("/ideas/new");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (showErr && e.target.value.trim().length >= MIN_CHARS) setShowErr(false);
        }}
        rows={3}
        maxLength={MAX_CHARS}
        aria-label="Describe your product idea"
        placeholder="Describe your product idea — what it does, who it's for…"
        className={`gib-ta${showErr ? " err" : ""}`}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span
          aria-live="polite"
          style={{
            fontFamily: "var(--font-chivo-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: showErr ? "var(--kill)" : "var(--faint)",
          }}
        >
          {showErr
            ? `At least ${MIN_CHARS} characters — one sentence is enough.`
            : "Saved in your browser — waiting for you right after the free signup."}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            className={`gib-count${text.length > 1900 ? " over" : text.length > 1700 ? " warn" : ""}`}
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {text.length} / {MAX_CHARS}
          </span>
          <button type="button" className="btn-p" onClick={submit}>
            Validate free →
          </button>
        </div>
      </div>
    </div>
  );
}

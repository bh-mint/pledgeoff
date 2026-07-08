"use client";

import { useState } from "react";
import { HOME_FAQ } from "@/app/home-faq";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = `home-faq-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        className="faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="faq-qt">{q}</span>
        <span className="faq-ic" aria-hidden="true">+</span>
      </button>
      <div id={id} className="faq-a">{a}</div>
    </div>
  );
}

export function HomeFAQ() {
  return (
    <div className="w-bleed" style={{ paddingBottom: 60 }}>
      <span className="eye" style={{ marginBottom: 16 }}>Frequently asked</span>
      <div style={{ maxWidth: 720 }}>
        {HOME_FAQ.map((f) => (
          <FAQItem key={f.q} {...f} />
        ))}
      </div>
    </div>
  );
}

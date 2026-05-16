"use client";

import { useState, useEffect } from "react";

export function HomeTickerCounter() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="mono text-[10px] text-(--t3)">
      page loaded {secondsAgo}s ago · Reddit · HN · GitHub
    </span>
  );
}

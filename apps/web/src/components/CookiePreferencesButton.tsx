"use client";

import { useState } from "react";
import { CookieModal } from "@/components/CookieModal";
import { clearPreferences } from "@/lib/cookie-consent";

export function CookiePreferencesButton() {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    // Clear existing prefs so modal saves fresh
    clearPreferences();
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="hover:opacity-80 transition-opacity underline underline-offset-2 cursor-pointer"
        style={{ color: "inherit", background: "none", border: "none", padding: 0, font: "inherit" }}
      >
        Cookie preferences
      </button>

      {open && (
        <CookieModal onClose={() => setOpen(false)} />
      )}

    </>
  );
}

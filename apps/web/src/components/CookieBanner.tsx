"use client";

import { useEffect, useRef, useState } from "react";
import { CookieModal } from "@/components/CookieModal";
import { getPreferences, savePreferences, clearPreferences } from "@/lib/cookie-consent";

export function CookieBanner() {
  const [shown, setShown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const manageRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (getPreferences() === null) {
      const t = setTimeout(() => setShown(true), 450);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    savePreferences({ analytics: true });
    setShown(false);
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const handleModalClose = (saved: boolean) => {
    setModalOpen(false);
    if (saved) setShown(false);
  };

  return (
    <>
      <div
        className={`ck-banner${shown ? " show" : ""}`}
        role="region"
        aria-label="Cookie consent"
        aria-hidden={!shown}
      >
        <div className="ck-inner">
          <div className="ck-txt">
            <div className="ck-eyebrow">Cookies · This site</div>
            <p className="ck-copy">
              <b>We use analytics to improve PledgeOFF.</b>{" "}
              <span>No ads, no third-party data sales — just product telemetry to see what&apos;s working.</span>
            </p>
          </div>
          <div className="ck-acts">
            <button ref={manageRef} className="btn-g" type="button" onClick={openModal} tabIndex={shown ? 0 : -1}>
              Manage preferences
            </button>
            <button className="btn-p" type="button" onClick={acceptAll} tabIndex={shown ? 0 : -1}>
              Accept all
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <CookieModal
          triggerRef={manageRef}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}

/** Called from Footer "Cookie preferences" to re-open preferences */
export function resetCookieConsent() {
  if (typeof window === "undefined") return;
  clearPreferences();
  window.location.reload();
}

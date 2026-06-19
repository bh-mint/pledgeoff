"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 5000;

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

type ToastCtx = {
  success: (msg: string, opts?: { duration?: number }) => void;
  error: (msg: string, opts?: { duration?: number }) => void;
  warning: (msg: string, opts?: { duration?: number }) => void;
  info: (msg: string, opts?: { duration?: number }) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

const GLYPHS: Record<ToastType, string> = {
  success: "●",
  error: "✕",
  warning: "▲",
  info: "◆",
};

const LABELS: Record<ToastType, string> = {
  success: "Success · Confirmed",
  error: "Error · Failed",
  warning: "Warning · Review",
  info: "Info · Notice",
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startedRef = useRef(0);
  const deadRef = useRef(false);

  const remove = useCallback(() => {
    if (deadRef.current) return;
    deadRef.current = true;
    const el = cardRef.current;
    if (el) {
      el.classList.remove("in", "running");
      el.classList.add("out");
    }
    setTimeout(() => onDismiss(toast.id), 440);
  }, [onDismiss, toast.id]);

  function startTimer() {
    if (toast.duration === 0 || deadRef.current) return;
    startedRef.current = Date.now();
    timerRef.current = setTimeout(remove, remainingRef.current);
    cardRef.current?.classList.remove("paused");
    cardRef.current?.classList.add("running");
  }

  function pauseTimer() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current -= Date.now() - startedRef.current;
    cardRef.current?.classList.remove("running");
    cardRef.current?.classList.add("paused");
  }

  useEffect(() => {
    const rafId = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        cardRef.current?.classList.add("in");
        startTimer();
      })
    );
    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={cardRef}
      className={`toast t-${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <div className="toast-main">
        <div className="toast-eyebrow">
          <span>{GLYPHS[toast.type]}</span>
          {LABELS[toast.type]}
        </div>
        <div className="toast-msg">{toast.message}</div>
      </div>
      <button className="toast-dismiss" type="button" aria-label="Dismiss" onClick={remove}>
        ✕
      </button>
      {toast.duration > 0 && (
        <div
          className="toast-timer"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function push(type: ToastType, message: string, opts?: { duration?: number }) {
    setToasts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, message, duration: opts?.duration ?? DEFAULT_DURATION },
    ]);
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const ctx: ToastCtx = {
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    warning: (m, o) => push("warning", m, o),
    info: (m, o) => push("info", m, o),
  };

  const visible = toasts.slice(0, MAX_VISIBLE);
  const overflow = toasts.length - visible.length;

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {visible.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
        {overflow > 0 && (
          <div className="toast-more in">+{overflow} more</div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

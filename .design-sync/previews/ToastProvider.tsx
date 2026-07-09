import { ToastProvider } from "@pledgeoff/web";

export const WrappingContent = () => (
  <ToastProvider>
    <div style={{ padding: 20, background: "var(--surface)", border: "1px solid var(--line)", fontFamily: "var(--font-bitter), serif", color: "var(--ink)", fontSize: 14, maxWidth: 360 }}>
      App content lives inside ToastProvider. Call useToast() anywhere below it
      to push success / error toasts.
    </div>
  </ToastProvider>
);

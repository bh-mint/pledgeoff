type Align = "center" | "left" | "right";

interface InfoTooltipProps {
  children: React.ReactNode;
  content: string;
  align?: Align;
}

const ALIGN: Record<Align, string> = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
};

export function InfoTooltip({ children, content, align = "center" }: InfoTooltipProps) {
  return (
    <span className="relative group/tooltip inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute bottom-full mb-2 w-max max-w-[200px] px-2.5 py-2 rounded text-[11px] leading-snug opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50 hidden sm:block ${ALIGN[align]}`}
        style={{
          background: "#0e0e0e",
          color: "var(--t1)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

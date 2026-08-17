import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
      <div className="mb-4 grid grid-cols-3 gap-1.5" aria-hidden>
        {["#F5B814", "#3B9EF5", "#EC5A8D", "#4DA167", "#8B5CF6", "#F97316", "#0FB0C4", "#5B6BF0", "#C4CC28"].map(
          (color, i) => (
            <span
              key={color}
              className="size-3 rounded-[4px]"
              style={{
                background: color,
                opacity: [1, 0.25, 0.7, 0.3, 1, 0.5, 0.85, 0.2, 0.6][i],
              }}
            />
          ),
        )}
      </div>
      <p className="text-[15px] font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

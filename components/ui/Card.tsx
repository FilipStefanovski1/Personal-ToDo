import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag {...rest} className={`rounded-card border border-line bg-surface ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </h2>
  );
}

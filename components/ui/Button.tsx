"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:opacity-88 active:scale-[0.98]",
  secondary:
    "border border-line bg-surface text-ink hover:border-line-strong hover:bg-sunken active:scale-[0.98]",
  ghost: "text-ink-muted hover:bg-sunken hover:text-ink active:scale-[0.98]",
  danger:
    "border border-[#E5484D]/30 bg-[#E5484D]/8 text-[#D3383D] hover:bg-[#E5484D]/14 active:scale-[0.98] dark:text-[#FF9592]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-[14px] rounded-xl gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        VARIANTS[variant],
        className,
      ].join(" ")}
    />
  );
}

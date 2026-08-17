"use client";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Compact pill switcher used for Combined/By habit, theme, cell size, etc. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-sunken p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

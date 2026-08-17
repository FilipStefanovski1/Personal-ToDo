"use client";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        checked ? "bg-ink" : "bg-line-strong",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 size-5 rounded-full bg-surface transition-transform duration-200",
          "shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

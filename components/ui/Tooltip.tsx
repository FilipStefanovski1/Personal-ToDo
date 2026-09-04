"use client";

import { Portal } from "./Portal";

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  detail: string;
  color?: string;
}

/**
 * A single fixed-position tooltip shared by a whole grid. Grids have thousands
 * of cells, so they use event delegation and drive this one node rather than
 * mounting a tooltip per cell.
 */
export function GridTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;

  return (
    <Portal>
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      style={{ left: state.x, top: state.y - 10 }}
    >
      <p className="whitespace-nowrap text-[12.5px] font-semibold tracking-tight">{state.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-muted">
        {state.color ? (
          <span className="size-2 rounded-[3px]" style={{ background: state.color }} />
        ) : null}
        {state.detail}
      </p>
    </div>
    </Portal>
  );
}

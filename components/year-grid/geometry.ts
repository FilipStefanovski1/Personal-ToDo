import type { CellSize } from "@/types";
import { daysInMonth } from "@/lib/dates";

export const CELL_GAP = 1;
export const ROW_GAP = 3;

/**
 * Cell width per size setting, and the row height that goes with it.
 *
 * At the smaller sizes cells are slightly taller than they are wide. 365
 * columns can never fit a screen at a legible width, so instead of shrinking
 * to invisible dots the cells become thin vertical bars — the sheet stays
 * dense and readable, and each row is tall enough to carry its habit label.
 */
const CELL_WIDTH: Record<CellSize, number> = { sm: 5, md: 8, lg: 12 };
const MIN_ROW_HEIGHT = 13;

export interface GridMetrics {
  cellWidth: number;
  rowHeight: number;
  /** Distance from one row's top to the next. */
  rowPitch: number;
  columnPitch: number;
}

export function gridMetrics(size: CellSize): GridMetrics {
  const cellWidth = CELL_WIDTH[size];
  const rowHeight = Math.max(cellWidth, MIN_ROW_HEIGHT);
  return {
    cellWidth,
    rowHeight,
    rowPitch: rowHeight + ROW_GAP,
    columnPitch: cellWidth + CELL_GAP,
  };
}

export function trackWidth(columnPitch: number, columns: number): number {
  return columns * columnPitch;
}

/** Pixel offset and width of each month band along the year track. */
export function monthBands(year: number, columnPitch: number) {
  let offset = 0;
  return Array.from({ length: 12 }, (_, month) => {
    const days = daysInMonth(year, month);
    const band = { month, left: offset * columnPitch, width: days * columnPitch, days };
    offset += days;
    return band;
  });
}

/** Column index (0-based) of a date within its year. */
export function dayOfYearIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  let index = 0;
  for (let i = 0; i < m - 1; i++) index += daysInMonth(y, i);
  return index + d - 1;
}

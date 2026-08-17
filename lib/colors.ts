/**
 * A hand-picked palette. Every swatch is chosen to stay vivid on both the cream
 * light background and the charcoal dark one — no per-theme color swapping
 * needed, which keeps a habit's identity stable across themes.
 */
export interface Swatch {
  name: string;
  hex: string;
}

/**
 * Sixteen swatches, ordered around the wheel so neighbouring picks stay
 * harmonious. They share a saturation and lightness range, which is what keeps
 * a year grid full of them reading as cohesive rather than as rainbow noise.
 */
export const PALETTE: Swatch[] = [
  { name: "Ember", hex: "#F0533A" },
  { name: "Tangerine", hex: "#F97316" },
  { name: "Amber", hex: "#F5B814" },
  { name: "Citron", hex: "#C4CC28" },
  { name: "Moss", hex: "#7CB342" },
  { name: "Fern", hex: "#4DA167" },
  { name: "Emerald", hex: "#12A594" },
  { name: "Lagoon", hex: "#0FB0C4" },
  { name: "Sky", hex: "#3B9EF5" },
  { name: "Indigo", hex: "#5B6BF0" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Orchid", hex: "#C05BE0" },
  { name: "Rose", hex: "#EC5A8D" },
  { name: "Coral", hex: "#F2707A" },
  { name: "Clay", hex: "#B4643C" },
  { name: "Slate", hex: "#64748B" },
];

export const DEFAULT_COLOR = PALETTE[7].hex;

/** Emoji offered in the habit editor picker. */
export const EMOJI_CHOICES = [
  "💊", "⚡", "🏋️", "💧", "📖", "🧘", "😴", "🏃", "🚴", "🧠",
  "🎯", "✍️", "🎨", "🎸", "🌱", "🍎", "☀️", "🌙", "🧊", "🛠️",
  "💻", "📷", "🗣️", "🧹", "💰", "🙏", "🚶", "🥗", "☕", "🔥",
];

/** Perceived luminance (0–1) via the sRGB relative-luminance-ish weights. */
export function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Black or white, whichever reads better on top of `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.6 ? "#1A1917" : "#FFFFFF";
}

/** `hex` with an alpha channel, for soft tints and rings. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${clean}${a}`;
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Flat, hard-stop vertical stripes — one per completed habit. Used for the
 * combined year grid and month-cell fills, where a day may hold several habits.
 * Deliberately not a gradient: the stops are hard so it reads as solid blocks.
 */
export function stripeBackground(colors: string[]): string {
  if (colors.length === 0) return "transparent";
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops = colors.flatMap((c, i) => [
    `${c} ${(i * step).toFixed(3)}%`,
    `${c} ${((i + 1) * step).toFixed(3)}%`,
  ]);
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

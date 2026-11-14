import type { CSSProperties } from "react";
import type { BarCustomizations } from "../types";

/**
 * Board-card palettes for the general broadcast view, and the mapping from the
 * operator's colour picks to the card's CSS tokens (see OlympiadCard.css).
 *
 * The operator picks the few colours that matter — card, outline, bar, names,
 * move number — and the quieter ones (notch fill, the notch's top line, eval
 * text, muted names) are derived from those, so any pick stays legible.
 */

export type CardColors = Pick<
  BarCustomizations,
  | "containerBackground"
  | "containerBorderColor"
  | "whiteBarColor"
  | "blackBarColor"
  | "whitePlayerNameColor"
  | "blackPlayerNameColor"
  | "turnArrowColor"
>;

/**
 * The default. A graphite card with a silver edge: dark enough that white
 * names and the bar read on any feed, with an outline that still separates it
 * from a black or a busy background. The bar's dark side is lifted off the card
 * fill so the split stays visible at either extreme.
 */
export const NEUTRAL_COLORS: CardColors = {
  containerBackground: "#17181b",
  containerBorderColor: "#8a8f98",
  whiteBarColor: "#f2f2f3",
  blackBarColor: "#3a3c41",
  whitePlayerNameColor: "#f2f2f3",
  blackPlayerNameColor: "#f2f2f3",
  turnArrowColor: "#e4e5e8",
};

/**
 * The broadcast view's default: near-black red with a red edge. The red is
 * the outline and the notch tab only — names, clocks and the bar stay light,
 * and the alert and low-clock colours switch to amber so they still stand out
 * (see warningColors).
 */
export const CRIMSON_COLORS: CardColors = {
  containerBackground: "#1c0a0d",
  containerBorderColor: "#e5484d",
  whiteBarColor: "#fff1f2",
  blackBarColor: "#4a1d24",
  whitePlayerNameColor: "#fff1f2",
  blackPlayerNameColor: "#fff1f2",
  turnArrowColor: "#fda4af",
};

/** The Olympiad overlay's navy and gold, matched to the Olympiad backdrop. */
export const OLYMPIAD_COLORS: CardColors = {
  containerBackground: "#071a30",
  containerBorderColor: "#ebc463",
  whiteBarColor: "#f9f1da",
  blackBarColor: "#2c2717",
  whitePlayerNameColor: "#ffffff",
  blackPlayerNameColor: "#ffffff",
  turnArrowColor: "#f9f1da",
};

export interface ThemePreset {
  name: string;
  colors: CardColors;
  /** Shown in the preview: where a palette needs care on air. */
  note?: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Crimson", colors: CRIMSON_COLORS },
  { name: "Neutral", colors: NEUTRAL_COLORS },
  { name: "Olympiad", colors: OLYMPIAD_COLORS },
  {
    name: "Mono",
    colors: {
      containerBackground: "#000000",
      containerBorderColor: "#ffffff",
      whiteBarColor: "#ffffff",
      blackBarColor: "#2b2b2b",
      whitePlayerNameColor: "#ffffff",
      blackPlayerNameColor: "#ffffff",
      turnArrowColor: "#ffffff",
    },
  },
  {
    name: "Ivory",
    note: "Light card — best on dark or busy backgrounds",
    colors: {
      containerBackground: "#f4f1ea",
      containerBorderColor: "#2a2621",
      whiteBarColor: "#ffffff",
      blackBarColor: "#2a2621",
      whitePlayerNameColor: "#1b1814",
      blackPlayerNameColor: "#1b1814",
      turnArrowColor: "#1b1814",
    },
  },
  {
    name: "Slate",
    colors: {
      containerBackground: "#0f172a",
      containerBorderColor: "#64748b",
      whiteBarColor: "#f8fafc",
      blackBarColor: "#334155",
      whitePlayerNameColor: "#f1f5f9",
      blackPlayerNameColor: "#f1f5f9",
      turnArrowColor: "#cbd5e1",
    },
  },
  {
    name: "Ocean",
    colors: {
      containerBackground: "#071a2b",
      containerBorderColor: "#38bdf8",
      whiteBarColor: "#f0f9ff",
      blackBarColor: "#12395a",
      whitePlayerNameColor: "#f0f9ff",
      blackPlayerNameColor: "#f0f9ff",
      turnArrowColor: "#7dd3fc",
    },
  },
  {
    name: "Royal",
    colors: {
      containerBackground: "#1a1033",
      containerBorderColor: "#a78bfa",
      whiteBarColor: "#f5f3ff",
      blackBarColor: "#3b2a63",
      whitePlayerNameColor: "#f5f3ff",
      blackPlayerNameColor: "#f5f3ff",
      turnArrowColor: "#c4b5fd",
    },
  },
  {
    name: "Gold",
    colors: {
      containerBackground: "#0b0b0b",
      containerBorderColor: "#d4af37",
      whiteBarColor: "#fbf7ea",
      blackBarColor: "#3a3220",
      whitePlayerNameColor: "#fbf7ea",
      blackPlayerNameColor: "#fbf7ea",
      turnArrowColor: "#e9cf7a",
    },
  },
  {
    name: "Walnut",
    colors: {
      containerBackground: "#1f1a16",
      containerBorderColor: "#b08a62",
      whiteBarColor: "#f6efe6",
      blackBarColor: "#4a3b2f",
      whitePlayerNameColor: "#f6efe6",
      blackPlayerNameColor: "#f6efe6",
      turnArrowColor: "#d9b98f",
    },
  },
  {
    name: "CBI",
    colors: {
      containerBackground: "#000000",
      containerBorderColor: "#E79D29",
      whiteBarColor: "#ffffff",
      blackBarColor: "#3a2a12",
      whitePlayerNameColor: "#FFFFFF",
      blackPlayerNameColor: "#E79D29",
      turnArrowColor: "#FFA500",
    },
  },
  {
    name: "Lichess",
    colors: {
      containerBackground: "#262421",
      containerBorderColor: "#5b5650",
      whiteBarColor: "#ffffff",
      blackBarColor: "#4d4d4d",
      whitePlayerNameColor: "#ffffff",
      blackPlayerNameColor: "#bfbfbf",
      turnArrowColor: "#7fa650",
    },
  },
  {
    name: "Chess.com",
    colors: {
      containerBackground: "#312e2b",
      containerBorderColor: "#5d5954",
      whiteBarColor: "#f9f9f9",
      blackBarColor: "#564f4a",
      whitePlayerNameColor: "#ffffff",
      blackPlayerNameColor: "#c9c7c5",
      turnArrowColor: "#81b64c",
    },
  },
  {
    name: "Midnight",
    colors: {
      containerBackground: "#0d1117",
      containerBorderColor: "#30363d",
      whiteBarColor: "#e6edf3",
      blackBarColor: "#21262d",
      whitePlayerNameColor: "#e6edf3",
      blackPlayerNameColor: "#79c0ff",
      turnArrowColor: "#d29922",
    },
  },
];

type Rgb = [number, number, number];

function parseHex(color: string): Rgb | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3 || hex.length === 4
      ? hex
          .slice(0, 3)
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` of `b` mixed into `a`. Falls back to `a` for colours it cannot read. */
function mix(a: string, b: string, amount: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  if (!from || !to) return a;
  return toHex(from.map((value, index) => value + (to[index] - value) * amount) as Rgb);
}

function withAlpha(color: string, alpha: number): string {
  const rgb = parseHex(color);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : color;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Hue in degrees (0–360) and HSL saturation (0–1), or null if unreadable. */
function hueAndSaturation(color: string): { hue: number; saturation: number } | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0 };
  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation };
}

/** Red to red-pink: the band where a red alert or a red clock would blend in. */
export function isReddish(color: string): boolean {
  const hs = hueAndSaturation(color);
  if (!hs) return false;
  return hs.saturation >= 0.35 && (hs.hue <= 20 || hs.hue >= 330);
}

const ALERT_RED = "#ff3b30";
const CLOCK_RED = "#ff5f57";
const AMBER = "#ffb020";

/**
 * The blunder flash and the low-clock colour. Red by default; amber when the
 * palette is itself red (outline or card), since a red flash on a red edge
 * barely changes the card.
 */
export function warningColors(colors: CardColors): { alert: string; clockLow: string } {
  const red = isReddish(colors.containerBorderColor) || isReddish(colors.containerBackground);
  return red ? { alert: AMBER, clockLow: AMBER } : { alert: ALERT_RED, clockLow: CLOCK_RED };
}

/** Near-black or near-white, whichever reads on `background`. */
function inkOn(background: string): string {
  return luminance(background) > 0.35 ? "#111214" : "#f4f4f5";
}

/**
 * Frame styles. "outline" is the Olympiad card; "solid" drops the outline;
 * "filled" paints the notch in the outline colour so the move number becomes
 * a tab; "glass" lets the background through (needs an alpha source in OBS —
 * on a chroma key the see-through parts key out with the green).
 */
export const CARD_FRAMES = ["outline", "solid", "filled", "glass"] as const;
export type CardFrame = (typeof CARD_FRAMES)[number];

/** Eval bar shapes: the rounded default, square-cornered, or a slimmer bar. */
export const BAR_SHAPES = ["pill", "square", "slim"] as const;
export type BarShape = (typeof BAR_SHAPES)[number];

export const FRAME_LABELS: Record<CardFrame, string> = {
  outline: "Outline",
  solid: "Solid",
  filled: "Filled notch",
  glass: "Glass",
};

export const BAR_LABELS: Record<BarShape, string> = {
  pill: "Rounded",
  square: "Square",
  slim: "Slim",
};

export function cardStyleClass(frame: CardFrame, bar: BarShape): string {
  return `frame-${frame} bar-${bar}`;
}

export const COLOR_KEYS: Array<keyof CardColors> = [
  "containerBackground",
  "containerBorderColor",
  "whiteBarColor",
  "blackBarColor",
  "whitePlayerNameColor",
  "blackPlayerNameColor",
  "turnArrowColor",
];

/** Is this the preset's palette, untouched? */
export function matchesPreset(colors: CardColors, preset: ThemePreset): boolean {
  return COLOR_KEYS.every((key) => colors[key].toLowerCase() === preset.colors[key].toLowerCase());
}

/** The card's CSS tokens for a set of colour picks. */
export function cardThemeVars(colors: CardColors): CSSProperties {
  const fill = colors.containerBackground;
  const stroke = colors.containerBorderColor;
  const quietLine = withAlpha(stroke, 0.3);
  const warnings = warningColors(colors);
  return {
    "--alert": warnings.alert,
    "--clock-low": warnings.clockLow,
    "--card-fill": fill,
    "--card-stroke": stroke,
    "--notch-fill": mix(fill, stroke, 0.14),
    "--notch-stroke": quietLine,
    "--bar-stroke": quietLine,
    "--bar-white": colors.whiteBarColor,
    "--bar-black": colors.blackBarColor,
    "--eval-on-white": inkOn(colors.whiteBarColor),
    "--eval-on-black": inkOn(colors.blackBarColor),
    "--name-white": colors.whitePlayerNameColor,
    "--name-black": colors.blackPlayerNameColor,
    "--clock-white": colors.whitePlayerNameColor,
    "--clock-black": colors.blackPlayerNameColor,
    "--name-muted": withAlpha(colors.whitePlayerNameColor, 0.5),
    "--move": colors.turnArrowColor,
    // Text on the outline colour, for the filled-notch frame
    "--stroke-ink": inkOn(stroke),
    // The final score, on the card itself
    "--result": inkOn(fill),
  } as CSSProperties;
}

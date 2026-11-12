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

export const THEME_PRESETS: Array<{ name: string; colors: CardColors }> = [
  { name: "Neutral", colors: NEUTRAL_COLORS },
  { name: "Olympiad", colors: OLYMPIAD_COLORS },
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

/** Near-black or near-white, whichever reads on `background`. */
function inkOn(background: string): string {
  return luminance(background) > 0.35 ? "#111214" : "#f4f4f5";
}

/** The card's CSS tokens for a set of colour picks. */
export function cardThemeVars(colors: CardColors): CSSProperties {
  const fill = colors.containerBackground;
  const stroke = colors.containerBorderColor;
  const quietLine = withAlpha(stroke, 0.3);
  return {
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
  } as CSSProperties;
}

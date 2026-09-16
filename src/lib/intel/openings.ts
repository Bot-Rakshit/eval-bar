import openings from "./openings.json";

/** Board-only FEN → opening name (ported from 0chess opening-detection). */
const BY_BOARD = new Map<string, string>();
for (const opening of openings as Array<{ name: string; fen: string }>) {
  BY_BOARD.set(opening.fen.trim().split(" ")[0], opening.name);
}

export function detectOpening(fen: string): string | null {
  if (!fen) return null;
  return BY_BOARD.get(fen.split(" ")[0]) ?? null;
}

/** "Sicilian Defense: Najdorf Variation, English Attack" → "Najdorf, English Attack" */
export function shortOpeningName(name: string, maxLength = 26): string {
  let text = name;
  if (text.length > maxLength && text.includes(":")) {
    text = text.slice(text.indexOf(":") + 1).trim();
  }
  text = text
    .replace(/\b(Variation|Defense|Defence|Opening|System|Line)\b/g, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (text.length > maxLength && text.includes(",")) {
    text = text.slice(0, text.lastIndexOf(",")).trim();
  }
  if (text.length > maxLength) text = `${text.slice(0, maxLength - 1).trim()}…`;
  return text || name;
}

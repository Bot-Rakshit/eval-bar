/** Material and game-phase heuristics from a FEN (ported from 0chess phase-calculator). */

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export interface Material {
  white: number;
  black: number;
  /** white minus black, in pawns */
  diff: number;
  queens: number;
  total: number;
}

export function materialFromFen(fen: string): Material {
  const board = fen.split(" ")[0] ?? "";
  let white = 0;
  let black = 0;
  let queens = 0;
  for (const ch of board) {
    const value = VALUES[ch.toLowerCase()];
    if (!value) continue;
    if (ch === ch.toUpperCase()) white += value;
    else black += value;
    if (ch.toLowerCase() === "q") queens += 1;
  }
  return { white, black, diff: white - black, queens, total: white + black };
}

export type Phase = "opening" | "middlegame" | "endgame";

export function phaseFromFen(fen: string, moveNumber: number): Phase {
  const { total, queens } = materialFromFen(fen);
  if ((queens === 0 && total <= 22) || total <= 14) return "endgame";
  return moveNumber <= 10 ? "opening" : "middlegame";
}

/** Ply index of a FEN (0 = start position). */
export function plyFromFen(fen: string): number {
  const parts = fen.split(" ");
  const fullmove = Number(parts[5]) || 1;
  return (fullmove - 1) * 2 + (parts[1] === "b" ? 1 : 0);
}

export function whiteToMove(fen: string): boolean {
  return fen.split(" ")[1] !== "b";
}

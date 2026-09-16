/**
 * Win-percentage model and move classification, ported from 0chess
 * (src/lib/winPercentage.ts, src/lib/move-classification.ts).
 * Evaluations are pawns from White's perspective.
 */

const MULTIPLIER = -0.00368208;

/** Lichess's win-percentage curve: 0..100 for White, from centipawns. */
export function winPercentageFromCp(cp: number): number {
  const clamped = Math.min(1000, Math.max(-1000, cp));
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * clamped)) - 1;
  return 50 + 50 * winChances;
}

export function winPercentage(evaluation: number | null, mateIn: number | null): number {
  if (mateIn !== null) return mateIn > 0 ? 100 : 0;
  if (evaluation === null) return 50;
  return winPercentageFromCp(evaluation * 100);
}

/** Expected points for White from a win percentage. */
export function expectedPoints(winPct: number): number {
  return winPct / 100;
}

export type MoveVerdict = "blunder" | "mistake" | "inaccuracy" | "ok";

/**
 * Basic classification of the move just played, from the win% before and
 * after it, from the mover's point of view.
 */
export function classifyMove(winBefore: number, winAfter: number, whiteMoved: boolean): MoveVerdict {
  const diff = (winAfter - winBefore) * (whiteMoved ? 1 : -1);
  if (diff < -20) return "blunder";
  if (diff < -10) return "mistake";
  if (diff < -5) return "inaccuracy";
  return "ok";
}

export const WINNING_MIN_PERCENT = 65;
export const LOSING_MAX_PERCENT = 35;
export const EQUALISH_WIN_LOW = 42;
export const EQUALISH_WIN_HIGH = 58;

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

/*
 * Board projection model, fitted to the 46th Olympiad: 3,994 decided rated
 * games from rounds 1–6, sampled every ten moves and evaluated by Stockfish at
 * depth 12, scored against the actual results (draws count ½). On held-out
 * games it cuts the Brier score from 0.137 to 0.078 compared with reading the
 * Lichess curve straight off the eval; on games within 100 Elo, from 0.114 to
 * 0.099.
 *
 * Two terms on one logistic. The eval, a little steeper than Lichess's curve
 * because players at this level convert more reliably than the lichess
 * population it was fitted on. And the rating gap, as plain Elo odds — a 2760
 * against a 2360 really does score ~90% from an equal-looking position — faded
 * as the game goes on, because the eval already reflects whatever the stronger
 * player has made of it so far.
 */
const EVAL_SLOPE = 0.7704; // per pawn
const RATING_WEIGHT = 1.0866; // × Elo logit
const RATING_FADE_MOVES = 70;
const BIAS = -0.048; // offsets the eval's own small White edge at move one

/**
 * Expected score for White on one live board. Ratings of 0 mean unknown and
 * drop the rating term; a board with no eval yet still gets it, so a round
 * has a meaningful projection from move one.
 */
export function expectedScoreWhite(
  evaluation: number | null,
  mateIn: number | null,
  whiteElo: number,
  blackElo: number,
  moveNumber: number
): number {
  if (mateIn !== null) return mateIn > 0 ? 1 : 0;
  const pawns = Math.min(10, Math.max(-10, evaluation ?? 0));
  const ratingGap = whiteElo > 0 && blackElo > 0 ? whiteElo - blackElo : 0;
  const ratingLogit = ((ratingGap * Math.LN10) / 400) * Math.exp(-Math.max(0, moveNumber) / RATING_FADE_MOVES);
  const z = EVAL_SLOPE * pawns + RATING_WEIGHT * ratingLogit + BIAS;
  return 1 / (1 + Math.exp(-z));
}

/**
 * The eval alone as a score for White, 0..1, for display. Same Olympiad data
 * as above with the ratings left out, fitted without a bias term so that 0.00
 * reads exactly level. Scores results more accurately than the Lichess curve
 * (Brier 0.126 against 0.137) while staying a pure function of the eval.
 */
const DISPLAY_EVAL_SLOPE = 0.9087; // per pawn

export function evalScoreWhite(evaluation: number | null, mateIn: number | null): number {
  if (mateIn !== null) return mateIn > 0 ? 1 : 0;
  if (evaluation === null) return 0.5;
  const pawns = Math.min(10, Math.max(-10, evaluation));
  return 1 / (1 + Math.exp(-DISPLAY_EVAL_SLOPE * pawns));
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

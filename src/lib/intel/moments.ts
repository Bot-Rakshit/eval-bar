import { TrackedGame } from "../../types";
import { formatPlayerName } from "../playerName";
import { plyFromFen, whiteToMove } from "./material";
import {
  classifyMove,
  expectedScoreWhite,
  LOSING_MAX_PERCENT,
  winPercentage,
  WINNING_MIN_PERCENT,
} from "./winPercentage";

/**
 * A "moment" is a short on-air callout derived from what just happened on a
 * board — it briefly replaces the eval bar.
 */
export type MomentTone = "good" | "bad" | "neutral" | "alert";

export interface Moment {
  id: string;
  kind: string;
  /** The whole callout as a sentence, e.g. "Blunder by Gukesh". */
  text: string;
  /** The same callout split for the banner: what happened, and to whom. */
  label: string;
  subject: string;
  /** Which side `subject` is playing, so the banner can show their flag. */
  side: "white" | "black";
  tone: MomentTone;
  priority: number;
  durationMs: number;
}

/** Per-board memory between detections. */
export interface BoardMemory {
  settledFen: string;
  settledEval: number | null;
  settledMate: number | null;
  timeFlags: { white: number; black: number };
  resultShown: boolean;
  firedAt: Record<string, number>;
}

export function freshMemory(): BoardMemory {
  return {
    settledFen: "",
    settledEval: null,
    settledMate: null,
    timeFlags: { white: 0, black: 0 },
    resultShown: false,
    firedAt: {},
  };
}

const SETTLED_DEPTH = 12;
const DEFAULT_DURATION_MS = 5000;

interface Ctx {
  game: TrackedGame;
  team: string;
  now: number;
  memory: BoardMemory;
  out: Moment[];
}

let counter = 0;

function isTeam(candidate: string, team: string): boolean {
  return candidate.trim().toLowerCase() === team.trim().toLowerCase();
}

interface Callout {
  label: string;
  /** true when the callout is about White's player */
  white: boolean;
  text: string;
}

function push(ctx: Ctx, kind: string, callout: Callout, tone: MomentTone, priority: number, cooldownMs = 0) {
  const last = ctx.memory.firedAt[kind] ?? 0;
  if (cooldownMs > 0 && ctx.now - last < cooldownMs) return;
  ctx.memory.firedAt[kind] = ctx.now;
  counter += 1;
  ctx.out.push({
    id: `${ctx.game.key}:${kind}:${counter}`,
    kind,
    text: callout.text,
    label: callout.label,
    subject: nameOf(ctx.game, callout.white),
    side: callout.white ? "white" : "black",
    tone,
    priority,
    durationMs: DEFAULT_DURATION_MS,
  });
}

/** Tone from the team's point of view: something good for `side` (white/black). */
function toneFor(ctx: Ctx, sideIsWhite: boolean, goodForSide: boolean): MomentTone {
  const { game, team } = ctx;
  const sideIsTeam = sideIsWhite ? isTeam(game.whiteTeam, team) : isTeam(game.blackTeam, team);
  return sideIsTeam === goodForSide ? "good" : "bad";
}

function nameOf(game: TrackedGame, white: boolean): string {
  return formatPlayerName(white ? game.whitePlayer : game.blackPlayer, true);
}

function detectResult(ctx: Ctx) {
  const { game, memory } = ctx;
  if (!game.result || memory.resultShown) return;
  memory.resultShown = true;
  if (game.result === "1/2-1/2") {
    const teamIsWhite = isTeam(game.whiteTeam, ctx.team);
    push(ctx, "result", { label: "Draw", white: teamIsWhite, text: `${nameOf(game, teamIsWhite)} draws` }, "neutral", 100);
    return;
  }
  const whiteWon = game.result === "1-0";
  push(ctx, "result", { label: "Win", white: whiteWon, text: `${nameOf(game, whiteWon)} wins` }, toneFor(ctx, whiteWon, true), 100);
}

function detectClocks(ctx: Ctx) {
  const { game, memory } = ctx;
  if (game.result) return;
  const sides: Array<["white" | "black", number]> = [
    ["white", game.whiteClock],
    ["black", game.blackClock],
  ];
  for (const [side, clock] of sides) {
    if (clock <= 0) continue;
    const white = side === "white";
    const flag = memory.timeFlags[side];
    if (clock < 60 && flag < 2) {
      memory.timeFlags[side] = 2;
      push(ctx, `time-${side}`, { label: "Under a minute", white, text: `${nameOf(game, white)} under a minute` }, "alert", 55);
    } else if (clock < 300 && flag < 1) {
      memory.timeFlags[side] = 1;
      push(ctx, `time-${side}`, { label: "Time trouble", white, text: `${nameOf(game, white)} in time trouble` }, "alert", 50);
    } else if (clock >= 1200 && flag > 0) {
      memory.timeFlags[side] = 0; // time control added time back
    }
  }
}

function detectEvalMoments(ctx: Ctx) {
  const { game, memory } = ctx;
  if (!game.fen || game.result) return;
  if (game.evaluation === null && game.mateIn === null) return;
  if (game.depth < SETTLED_DEPTH) return;
  if (game.fen === memory.settledFen) return;

  const prevFen = memory.settledFen;
  const prevEval = memory.settledEval;
  const prevMate = memory.settledMate;
  memory.settledFen = game.fen;
  memory.settledEval = game.evaluation;
  memory.settledMate = game.mateIn;
  if (!prevFen || (prevEval === null && prevMate === null)) return;

  const before = winPercentage(prevEval, prevMate);
  const after = winPercentage(game.evaluation, game.mateIn);
  const singlePly = plyFromFen(game.fen) - plyFromFen(prevFen) === 1;
  const moverIsWhite = whiteToMove(prevFen);
  const mover = nameOf(game, moverIsWhite);

  // Mate announced
  if (game.mateIn !== null && prevMate === null) {
    const forWhite = game.mateIn > 0;
    const label = `Mate in ${Math.abs(game.mateIn)}`;
    push(ctx, "mate", { label, white: forWhite, text: `${label} for ${nameOf(game, forWhite)}` }, toneFor(ctx, forWhite, true), 90, 60000);
    return;
  }

  // Move quality (only attributable when exactly one move was played)
  if (singlePly) {
    const verdict = classifyMove(before, after, moverIsWhite);
    if (verdict === "blunder") {
      push(ctx, "blunder", { label: "Blunder", white: moverIsWhite, text: `Blunder by ${mover}` }, toneFor(ctx, moverIsWhite, false), 80, 20000);
      return;
    }
    if (verdict === "mistake") {
      push(ctx, "mistake", { label: "Mistake", white: moverIsWhite, text: `Mistake by ${mover}` }, toneFor(ctx, moverIsWhite, false), 45, 30000);
      return;
    }
  }

  // Someone just became clearly winning
  const wasDecided = before >= WINNING_MIN_PERCENT || before <= LOSING_MAX_PERCENT;
  const nowWhiteWinning = after >= WINNING_MIN_PERCENT;
  const nowBlackWinning = after <= LOSING_MAX_PERCENT;
  if (!wasDecided && (nowWhiteWinning || nowBlackWinning)) {
    push(ctx, "winning", { label: "Winning", white: nowWhiteWinning, text: `${nameOf(game, nowWhiteWinning)} is winning` }, toneFor(ctx, nowWhiteWinning, true), 60, 90000);
  }
}

/** Detect new moments for a board; mutates `memory`. Returns moments by priority. */
export function detectMoments(game: TrackedGame, memory: BoardMemory, team: string, now = Date.now()): Moment[] {
  const ctx: Ctx = { game, team, now, memory, out: [] };
  detectResult(ctx);
  if (!game.result) {
    detectEvalMoments(ctx);
    detectClocks(ctx);
  }
  return ctx.out.sort((a, b) => b.priority - a.priority);
}

/** Projected match score from live evals (finished games count as played). */
/**
 * Expected match score, unrounded: decided games count their real result, the
 * rest their projected expected score (see expectedScoreWhite). `live` is how
 * many games are still undecided — none, and there is nothing to project.
 */
export function projectedRaw(
  games: TrackedGame[],
  team: string
): { us: number; them: number; live: number } {
  let us = 0;
  let them = 0;
  let live = 0;
  for (const game of games) {
    const teamIsWhite = isTeam(game.whiteTeam, team);
    let white: number;
    if (game.result) {
      white = game.result === "1-0" ? 1 : game.result === "0-1" ? 0 : 0.5;
    } else {
      live += 1;
      white = expectedScoreWhite(game.evaluation, game.mateIn, game.whiteElo, game.blackElo, game.moveNumber);
    }
    us += teamIsWhite ? white : 1 - white;
    them += teamIsWhite ? 1 - white : white;
  }
  return { us, them, live };
}

/** The same projection rounded to half points, for display. */
export function projectedScore(games: TrackedGame[], team: string): { us: number; them: number } | null {
  const raw = projectedRaw(games, team);
  if (raw.live === 0) return null;
  const roundHalf = (value: number) => Math.round(value * 2) / 2;
  return { us: roundHalf(raw.us), them: roundHalf(raw.them) };
}

import { TrackedGame } from "../types";
import { teamMatches } from "../hooks/useTeamRound";

/** 2.5 → "2½". Half points are the only fraction a match score can carry. */
export function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole >= 0.5;
  if (whole === 0 && half) return "½";
  return half ? `${whole}½` : `${whole}`;
}

/** Match score from the team's perspective; only decided games count. */
export function matchScore(games: TrackedGame[], team: string): { us: number; them: number } {
  let us = 0;
  let them = 0;
  for (const game of games) {
    if (!game.result) continue;
    const teamIsWhite = teamMatches(game.whiteTeam, team);
    if (game.result === "1/2-1/2") {
      us += 0.5;
      them += 0.5;
    } else if ((game.result === "1-0") === teamIsWhite) {
      us += 1;
    } else {
      them += 1;
    }
  }
  return { us, them };
}

/** The other team in the match, or "" before any pairing is known. */
export function opponentOf(games: TrackedGame[], team: string): string {
  for (const game of games) {
    if (game.whiteTeam && !teamMatches(game.whiteTeam, team)) return game.whiteTeam;
    if (game.blackTeam && !teamMatches(game.blackTeam, team)) return game.blackTeam;
  }
  return "";
}

/**
 * What an eval says a board is heading for, counted as a share of the point
 * for the side ahead: equal within ±1.0, slightly better to 2.0, clearly
 * better to 3.0, winning beyond.
 *
 * The equal band is wide on purpose. Out of the opening an engine routinely
 * shows White +0.3 to +0.8, and in a team match the followed team has Black on
 * two boards, so tighter bands read ordinary opening edges as advantages: in
 * round 8 v Azerbaijan (+0.47, +0.77 with India Black, +0.35, +0.01) the old
 * ±0.3 / 0.7 bands counted the +0.77 as "clearly better" for Azerbaijan and
 * India's two smaller edges as only "slightly better", and the bar sat at 45%
 * with every game level. Winning is 0.9, not 1, so one winning board alone
 * does not settle a match but two do.
 */
export const EVAL_BANDS: Array<{ upTo: number; points: number; label: string }> = [
  { upTo: 1.0, points: 0.5, label: "Equal" },
  { upTo: 2.0, points: 0.6, label: "Slightly better" },
  { upTo: 3.0, points: 0.75, label: "Clearly better" },
  { upTo: Infinity, points: 0.9, label: "Winning" },
];

/** The band an eval falls in, for the side it favours. */
export function evalBand(evaluation: number) {
  return EVAL_BANDS.find((band) => Math.abs(evaluation) <= band.upTo)!;
}

/** The points a board is heading for, from the team's side. */
export function predictedBoardPoints(game: TrackedGame, team: string): number {
  let white: number;
  if (game.result === "1-0") white = 1;
  else if (game.result === "0-1") white = 0;
  else if (game.result === "1/2-1/2") white = 0.5;
  else if (game.mateIn !== null) white = game.mateIn > 0 ? 1 : 0;
  else if (game.evaluation === null) white = 0.5;
  else {
    const ahead = evalBand(game.evaluation).points;
    white = game.evaluation >= 0 ? ahead : 1 - ahead;
  }
  return teamMatches(game.whiteTeam, team) ? white : 1 - white;
}

/**
 * Where the match is heading, 0..1 for the team: each board's result or
 * current eval band is read as a result, they are added up into a predicted
 * match score, and the bar shows it — half at 2–2, full once the prediction
 * reaches 2½ (a match win), empty at 1½. So two winning boards and two equal
 * ones (about 3–1) read full; two winning and two losing (2–2) read half.
 */
export function matchPredictionShare(games: TrackedGame[], team: string): number {
  if (games.length === 0) return 0.5;
  const predicted = games.reduce((sum, game) => sum + predictedBoardPoints(game, team), 0);
  const half = games.length / 2;
  return Math.min(1, Math.max(0, predicted - (half - 0.5)));
}

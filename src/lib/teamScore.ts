import { TrackedGame } from "../types";
import { teamMatches } from "../hooks/useTeamRound";
import { evalWdlWhite, Wdl } from "./intel/winPercentage";

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

/** One board's outcome for the team: finished games are certain. */
function boardWdl(game: TrackedGame, team: string): Wdl {
  let white: Wdl;
  if (game.result === "1-0") white = { win: 1, draw: 0, loss: 0 };
  else if (game.result === "0-1") white = { win: 0, draw: 0, loss: 1 };
  else if (game.result === "1/2-1/2") white = { win: 0, draw: 1, loss: 0 };
  else white = evalWdlWhite(game.evaluation, game.mateIn);
  return teamMatches(game.whiteTeam, team) ? white : { win: white.loss, draw: white.draw, loss: white.win };
}

/**
 * The team's chance of winning the match, 0..1, from the boards as they stand:
 * P(win the match) + ½·P(tie it). Each board's win/draw/loss chance comes from
 * its result or its current eval; the boards are combined into the full spread
 * of match scores, so a team that has 2½ of 4 already reads 1, a match
 * heading for 2–2 reads ½, and a 2–1 lead with a level last game reads high —
 * a draw there wins it. No ratings, no forecast beyond the evals on the boards.
 */
export function matchWinShare(games: TrackedGame[], team: string): number {
  if (games.length === 0) return 0.5;
  // Distribution over the team's total, counted in half points
  let spread = [1];
  for (const game of games) {
    const { win, draw, loss } = boardWdl(game, team);
    const next = new Array(spread.length + 2).fill(0);
    spread.forEach((p, halves) => {
      next[halves] += p * loss;
      next[halves + 1] += p * draw;
      next[halves + 2] += p * win;
    });
    spread = next;
  }
  // Out of 2 half points per board: more than half the total wins the match
  const half = games.length;
  let win = 0;
  let tie = 0;
  spread.forEach((p, halves) => {
    if (halves > half) win += p;
    else if (halves === half) tie += p;
  });
  return win + tie / 2;
}

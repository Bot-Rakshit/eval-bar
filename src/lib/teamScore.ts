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

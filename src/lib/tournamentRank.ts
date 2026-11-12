import { RoundInfo, TournamentSummary } from "../types";

/**
 * Orders the control page's broadcast list so the events a broadcaster is most
 * likely to want sit at the top.
 *
 * Lichess already ranks every broadcast with a tier (5 = top events such as
 * the World Championship, 4 = strong events, 3 = everything else). Within a
 * tier, events that name headline players come first — that is what separates
 * an elite team cup from twelve age-group sections of a youth championship —
 * then live rounds before ones still to start, sooner starts first.
 */

/** Tier 5, or tier 4 with named headline players. */
export function isRecommended(tournament: TournamentSummary): boolean {
  return tournament.tier >= 5 || (tournament.tier >= 4 && tournament.players !== "");
}

export function isLive(tournament: TournamentSummary): boolean {
  return tournament.rounds.some((round) => round.ongoing);
}

/** The round to follow: the one being played, else the next one to start. */
export function pickCurrentRound(rounds: RoundInfo[]): RoundInfo | null {
  return (
    rounds.find((round) => round.ongoing) ??
    rounds.find((round) => !round.finished) ??
    rounds[rounds.length - 1] ??
    null
  );
}

function nextStart(tournament: TournamentSummary): number {
  const upcoming = tournament.rounds
    .filter((round) => !round.finished && !round.ongoing && round.startsAt !== null)
    .map((round) => round.startsAt as number);
  return upcoming.length > 0 ? Math.min(...upcoming) : Number.POSITIVE_INFINITY;
}

export function rankTournaments(tournaments: TournamentSummary[]): TournamentSummary[] {
  return tournaments
    .map((tournament, index) => ({ tournament, index }))
    .sort((a, b) => {
      const x = a.tournament;
      const y = b.tournament;
      return (
        y.tier - x.tier ||
        Number(y.players !== "") - Number(x.players !== "") ||
        Number(isLive(y)) - Number(isLive(x)) ||
        nextStart(x) - nextStart(y) ||
        a.index - b.index
      );
    })
    .map(({ tournament }) => tournament);
}

/** "Live · Round 3", "Starts in 40 min · Round 4", "Starts in 5 h · Round 9". */
export function roundStatus(tournament: TournamentSummary, now = Date.now()): string {
  const round = pickCurrentRound(tournament.rounds);
  if (!round) return "";
  if (round.ongoing) return `Live · ${round.name}`;
  if (round.startsAt === null) return round.name;
  const minutes = Math.round((round.startsAt - now) / 60000);
  if (minutes <= 0) return `Starting · ${round.name}`;
  if (minutes < 60) return `Starts in ${minutes} min · ${round.name}`;
  return `Starts in ${Math.round(minutes / 60)} h · ${round.name}`;
}

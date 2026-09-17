import { useEffect, useRef, useState } from "react";
import { fetchBroadcastGroup, fetchRoundGames, fetchTournamentRounds } from "../api/lichess";
import { RoundInfo } from "../types";

const DISCOVERY_INTERVAL_MS = 60000;
const GROUP_REFRESH_MS = 10 * 60 * 1000;

/** Where a team is playing right now: which section broadcast, which round. */
export interface TeamRoundTarget {
  tourId: string;
  tourName: string;
  roundId: string;
  roundName: string;
  /** Names of the team's players in this round (fallback filter when PGN team tags are missing). */
  players: string[];
}

export function teamMatches(candidate: string | undefined, team: string): boolean {
  return (candidate ?? "").trim().toLowerCase() === team.trim().toLowerCase();
}

/** How long before a round starts we switch from the last results to its fixtures. */
const FIXTURES_AHEAD_MS = 6 * 60 * 60 * 1000;

/**
 * Rounds worth checking, best first: the ongoing round; otherwise the next
 * round once it's close enough that its pairings matter more than the last
 * results (only used if its games exist); then the most recently started
 * round and the one before it (a new round's games can take a while to
 * appear after its scheduled start).
 */
export function candidateRounds(rounds: RoundInfo[], now: number): RoundInfo[] {
  const ongoing = rounds.find((round) => round.ongoing);
  if (ongoing) return [ongoing];
  const candidates: RoundInfo[] = [];
  const upcoming = rounds.find((round) => round.startsAt !== null && round.startsAt > now);
  if (upcoming && upcoming.startsAt! - now <= FIXTURES_AHEAD_MS) candidates.push(upcoming);
  const started = rounds.filter((round) => round.startsAt !== null && round.startsAt <= now);
  candidates.push(...(started.length === 0 ? rounds.slice(0, 1) : started.slice(-2).reverse()));
  return candidates.filter((round, index) => candidates.indexOf(round) === index);
}

/**
 * Finds the section + round where `team` is currently playing inside a
 * broadcast group (e.g. the Olympiad's Open I–V), and keeps following it as
 * rounds advance or the team moves between sections.
 */
export function useTeamRound(
  anchorTourId: string,
  sectionPrefix: string,
  team: string
): { target: TeamRoundTarget | null; error: string | null } {
  const [target, setTarget] = useState<TeamRoundTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetRef = useRef<TeamRoundTarget | null>(null);
  targetRef.current = target;
  const toursRef = useRef<{ fetchedAt: number; tours: Array<{ id: string; name: string }> } | null>(null);

  useEffect(() => {
    if (!anchorTourId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadTours = async () => {
      const cached = toursRef.current;
      if (cached && Date.now() - cached.fetchedAt < GROUP_REFRESH_MS) return cached.tours;
      const all = await fetchBroadcastGroup(anchorTourId);
      const prefix = sectionPrefix.toLowerCase();
      const tours = all.filter((tour) => tour.name.trim().toLowerCase().startsWith(prefix));
      toursRef.current = { fetchedAt: Date.now(), tours: tours.length > 0 ? tours : all };
      return toursRef.current.tours;
    };

    const discover = async () => {
      try {
        // While the round we're on is still ongoing nothing can change — one
        // cheap request instead of scanning every section (Lichess rate limits).
        const current = targetRef.current;
        if (current) {
          const rounds = await fetchTournamentRounds(current.tourId).catch(() => [] as RoundInfo[]);
          if (rounds.find((round) => round.id === current.roundId)?.ongoing) {
            setError(null);
            if (!cancelled) timer = setTimeout(() => void discover(), DISCOVERY_INTERVAL_MS);
            return;
          }
        }

        const tours = await loadTours();
        const now = Date.now();
        let found: TeamRoundTarget | null = null;

        const perTour = await Promise.all(
          tours.map(async (tour) => {
            const rounds = await fetchTournamentRounds(tour.id).catch(() => [] as RoundInfo[]);
            return { tour, rounds: candidateRounds(rounds, now) };
          })
        );

        // Check the best candidate round across every section before falling back
        const depth = Math.max(0, ...perTour.map((entry) => entry.rounds.length));
        for (let index = 0; index < depth && !found; index += 1) {
          const checks = perTour
            .filter((entry) => entry.rounds[index])
            .map(async ({ tour, rounds }) => {
              const round = rounds[index];
              const games = await fetchRoundGames(round.id).catch(() => []);
              const players: string[] = [];
              for (const game of games) {
                for (const player of game.players ?? []) {
                  if (player.name && teamMatches(player.team, team)) players.push(player.name);
                }
              }
              return players.length > 0
                ? { tourId: tour.id, tourName: tour.name, roundId: round.id, roundName: round.name, players }
                : null;
            });
          found = (await Promise.all(checks)).find((entry) => entry !== null) ?? null;
        }

        if (cancelled) return;
        setError(null);
        if (found) {
          setTarget((current) =>
            current &&
            current.roundId === found!.roundId &&
            current.players.join("|") === found!.players.join("|")
              ? current
              : found
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Discovery failed");
      }
      if (!cancelled) timer = setTimeout(() => void discover(), DISCOVERY_INTERVAL_MS);
    };

    void discover();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [anchorTourId, sectionPrefix, team]);

  return { target, error };
}

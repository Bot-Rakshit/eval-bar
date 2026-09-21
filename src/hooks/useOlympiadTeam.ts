import { useEffect, useMemo, useRef } from "react";
import { TrackedGame } from "../types";
import { useRoundStream } from "./useRoundStream";
import { useTeamRound, teamMatches } from "./useTeamRound";
import { useTrackedGames } from "./useTrackedGames";

/** Any tour in the Olympiad group — the group lists every section. */
export const OLYMPIAD_ANCHOR_TOUR = "n1pPI5Q0";
export const DEFAULT_TEAM = "India";

/** `men` is an alias for Open, which is what Lichess calls the section. */
export const SECTIONS: Record<string, { prefix: string; label: string }> = {
  open: { prefix: "Open", label: "Open" },
  men: { prefix: "Open", label: "Open" },
  women: { prefix: "Women", label: "Women" },
};

export function sectionInfoFor(section: string) {
  return SECTIONS[section.toLowerCase()] ?? SECTIONS.open;
}

interface Options {
  section: string;
  team: string;
  anchorTour: string;
  /** Skip the network entirely; the caller supplies its own games. */
  demo?: boolean;
}

interface Result {
  sectionInfo: { prefix: string; label: string };
  games: TrackedGame[];
  roundName: string | null;
  error: string | null;
}

/**
 * The followed team's boards for the live Olympiad round, in a stable order.
 *
 * Shared by the bar overlay and the scorecard so the two can never disagree
 * about which games belong to the team or what order they are in.
 */
export function useOlympiadTeam({ section, team, anchorTour, demo = false }: Options): Result {
  const sectionInfo = sectionInfoFor(section);
  const { target, error } = useTeamRound(demo ? "" : anchorTour, sectionInfo.prefix, team);
  const { snapshots } = useRoundStream(target?.roundId ?? null);

  // The order is locked the first time a game shows up. `board` is not stable
  // across updates — the round API seeds it with the game's index in the whole
  // round, then the PGN stream overwrites it with the Round-tag suffix, one
  // board at a time — so re-sorting on every snapshot makes the bars hop about.
  const orderRef = useRef<string[]>([]);

  // A new round is a new set of boards; start the order fresh.
  useEffect(() => {
    orderRef.current = [];
  }, [target?.roundId]);

  // Prefer PGN team tags; fall back to the names discovered from the round API.
  const selectedKeys = useMemo((): string[] => {
    const players = target?.players ?? [];
    const wanted = Array.from(snapshots.values()).filter(
      (snapshot) =>
        teamMatches(snapshot.whiteTeam, team) ||
        teamMatches(snapshot.blackTeam, team) ||
        players.includes(snapshot.whitePlayer) ||
        players.includes(snapshot.blackPlayer)
    );
    const wantedKeys = new Set(wanted.map((snapshot) => snapshot.key));
    const kept = orderRef.current.filter((key) => wantedKeys.has(key));
    const known = new Set(kept);
    const added = wanted
      .filter((snapshot) => !known.has(snapshot.key))
      .sort((a, b) => a.board - b.board)
      .map((snapshot) => snapshot.key);
    orderRef.current = [...kept, ...added];
    return orderRef.current;
  }, [snapshots, target, team]);

  const { games } = useTrackedGames(snapshots, selectedKeys);

  return { sectionInfo, games, roundName: target?.roundName ?? null, error };
}

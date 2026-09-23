/** One row of the section table, as trimmed by /api/standings. */
export interface StandingRow {
  /**
   * Official place from chess-results (unique, FIDE tiebreaks). On the
   * Lichess fallback, teams level on match and game points share a place.
   */
  rank: number;
  name: string;
  /** Federation code from chess-results ("IND"); empty on the Lichess fallback */
  fed: string;
  /** Match points and game points */
  mp: number;
  gp: number;
}

export interface Standings {
  section: string;
  /** Which table the relay read: the official one, or Lichess as a fallback */
  source?: "chess-results" | "lichess";
  /** Rounds with a result in the table so far */
  rounds: number;
  /**
   * The top 10 (a tie at 10th shown whole), extended to two places below the
   * followed team when it sits just outside
   */
  top: StandingRow[];
  /** The followed team and the two places below it, when it is far down */
  tail: StandingRow[];
}

/**
 * Standings come through our own relay (api/standings.js): it reads the
 * official chess-results table, falls back to Lichess, trims and edge-caches.
 */
export async function fetchStandings(section: string, team: string, signal?: AbortSignal): Promise<Standings> {
  const query = new URLSearchParams({ section, team, top: "10" });
  const response = await fetch(`/api/standings?${query}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`standings ${response.status}`);
  return (await response.json()) as Standings;
}

/**
 * The official Open table after round 6 of the 46th Olympiad, as the relay
 * read it from chess-results, so ?demo=1 shows real data without the network.
 */
export const DEMO_STANDINGS: Standings = {
  section: "open",
  source: "chess-results",
  rounds: 6,
  top: [
    { rank: 1, name: "Uzbekistan", fed: "UZB", mp: 12, gp: 19.5 },
    { rank: 2, name: "China", fed: "CHN", mp: 11, gp: 18.5 },
    { rank: 3, name: "Armenia", fed: "ARM", mp: 11, gp: 17 },
    { rank: 4, name: "France", fed: "FRA", mp: 10, gp: 17.5 },
    { rank: 5, name: "Netherlands", fed: "NED", mp: 10, gp: 16 },
    { rank: 6, name: "Turkiye", fed: "TUR", mp: 10, gp: 17.5 },
    { rank: 7, name: "India", fed: "IND", mp: 10, gp: 16 },
    { rank: 8, name: "Greece", fed: "GRE", mp: 10, gp: 18 },
    { rank: 9, name: "Germany", fed: "GER", mp: 10, gp: 16 },
    { rank: 10, name: "England", fed: "ENG", mp: 10, gp: 16.5 },
  ],
  tail: [],
};

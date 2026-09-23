/** One row of the section table, as trimmed by /api/standings. */
export interface StandingRow {
  /** Competition rank: teams level on match and game points share a place. */
  rank: number;
  name: string;
  /** Match points and game points */
  mp: number;
  gp: number;
}

export interface Standings {
  section: string;
  /** Rounds with a result in the table so far */
  rounds: number;
  /** Everyone placed in the top N, a tie on the boundary shown whole */
  top: StandingRow[];
  /** The followed team, when it is not already in `top` */
  team: StandingRow | null;
}

/**
 * Lichess serves team standings without a CORS header, so they come through
 * our own relay (api/standings.js), which also trims and edge-caches them.
 */
export async function fetchStandings(section: string, team: string, signal?: AbortSignal): Promise<Standings> {
  const query = new URLSearchParams({ section, team, top: "10" });
  const response = await fetch(`/api/standings?${query}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`standings ${response.status}`);
  return (await response.json()) as Standings;
}

/**
 * The Open table after round 6 of the 46th Olympiad, as the relay returned it,
 * so ?demo=1 shows real-looking data without touching the network.
 */
export const DEMO_STANDINGS: Standings = {
  section: "open",
  rounds: 6,
  top: [
    { rank: 1, name: "Uzbekistan", mp: 12, gp: 19.5 },
    { rank: 2, name: "China", mp: 11, gp: 18.5 },
    { rank: 3, name: "Armenia", mp: 11, gp: 17 },
    { rank: 4, name: "Greece", mp: 10, gp: 18 },
    { rank: 5, name: "France", mp: 10, gp: 17.5 },
    { rank: 5, name: "Turkiye", mp: 10, gp: 17.5 },
    { rank: 7, name: "Azerbaijan", mp: 10, gp: 16.5 },
    { rank: 7, name: "Bulgaria", mp: 10, gp: 16.5 },
    { rank: 7, name: "England", mp: 10, gp: 16.5 },
    { rank: 10, name: "Germany", mp: 10, gp: 16 },
    { rank: 10, name: "India", mp: 10, gp: 16 },
    { rank: 10, name: "Netherlands", mp: 10, gp: 16 },
    { rank: 10, name: "United States of America", mp: 10, gp: 16 },
    { rank: 10, name: "Uzbekistan 2", mp: 10, gp: 16 },
  ],
  team: null,
};

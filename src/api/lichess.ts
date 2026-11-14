import { RoundInfo, TournamentSummary } from "../types";

const API_BASE = "https://lichess.org/api";
const REQUEST_TIMEOUT_MS = 15000;

interface ApiTour {
  id: string;
  name: string;
  description?: string;
  url?: string;
  tier?: number;
  info?: { players?: string };
}

interface ApiRound {
  id: string;
  name?: string;
  ongoing?: boolean;
  finished?: boolean;
  startsAt?: number;
}

interface ApiTournamentListEntry {
  tour: ApiTour;
  image?: string;
  rounds?: ApiRound[];
}

export interface ApiRoundGame {
  name: string;
  fen?: string;
  players?: Array<{ name?: string; clock?: number; team?: string; fed?: string; rating?: number }>;
  status?: string;
}

/** A broadcast group bundles the sections of one event (e.g. Olympiad Open I–V, Women I–IV). */
export interface BroadcastGroupTour {
  id: string;
  name: string;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Lichess API ${response.status} for ${url}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

function toRoundInfo(round: ApiRound): RoundInfo {
  return {
    id: round.id,
    name: round.name ?? "Round",
    ongoing: round.ongoing === true,
    finished: round.finished === true,
    startsAt: round.startsAt ?? null,
  };
}

/**
 * Broadcasts worth offering on the control page: any with a round on now, and
 * any whose next round starts within UPCOMING_WINDOW_MS, so a broadcaster can
 * set the overlay up before the round. Ordering is left to rankTournaments.
 */
const UPCOMING_WINDOW_MS = 12 * 60 * 60 * 1000;
const STALE_AFTER_MS = 60 * 60 * 1000;

export async function fetchLiveTournaments(now = Date.now()): Promise<TournamentSummary[]> {
  const response = await fetch(`${API_BASE}/broadcast?nb=100`);
  if (!response.ok) {
    throw new Error(`Lichess API ${response.status} for broadcast list`);
  }
  const text = await response.text();

  const tournaments: TournamentSummary[] = [];
  for (const line of text.trim().split("\n")) {
    if (!line.trim()) continue;
    let entry: ApiTournamentListEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // tolerate malformed NDJSON lines (OBS browser quirks)
    }
    if (!entry.tour || !entry.rounds || entry.rounds.length === 0) continue;
    const live = entry.rounds.some((round) => round.ongoing === true);
    // A round scheduled more than STALE_AFTER_MS ago that never went live is
    // a stale schedule, not one about to start.
    const startsSoon = entry.rounds.some(
      (round) =>
        !round.finished &&
        typeof round.startsAt === "number" &&
        round.startsAt - now <= UPCOMING_WINDOW_MS &&
        now - round.startsAt <= STALE_AFTER_MS
    );
    if (!live && !startsSoon) continue;
    tournaments.push({
      id: entry.tour.id,
      name: entry.tour.name,
      description: entry.tour.description ?? "",
      image: entry.image ?? null,
      url: entry.tour.url ?? "",
      rounds: entry.rounds.map(toRoundInfo),
      tier: entry.tour.tier ?? 0,
      players: entry.tour.info?.players?.trim() ?? "",
    });
  }
  return tournaments;
}

export async function fetchTournamentRounds(tournamentId: string): Promise<RoundInfo[]> {
  const data = await fetchJson<{ rounds?: ApiRound[] }>(`${API_BASE}/broadcast/${tournamentId}`);
  return (data.rounds ?? []).map(toRoundInfo);
}

export async function fetchBroadcastGroup(tournamentId: string): Promise<BroadcastGroupTour[]> {
  const data = await fetchJson<{
    tour?: ApiTour;
    group?: { tours?: Array<{ id: string; name: string }> };
  }>(`${API_BASE}/broadcast/${tournamentId}`);
  const tours = data.group?.tours ?? [];
  if (tours.length > 0) return tours.map((tour) => ({ id: tour.id, name: tour.name }));
  return data.tour ? [{ id: data.tour.id, name: data.tour.name }] : [];
}

export async function fetchRoundGames(roundId: string, signal?: AbortSignal): Promise<ApiRoundGame[]> {
  const data = await fetchJson<{ games?: ApiRoundGame[] }>(
    `${API_BASE}/broadcast/-/-/${roundId}`,
    signal
  );
  return data.games ?? [];
}

export async function streamRoundPgn(
  roundId: string,
  signal: AbortSignal,
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/stream/broadcast/round/${roundId}.pgn`, { signal });
  if (!response.ok) {
    throw new Error(`PGN stream ${response.status} for round ${roundId}`);
  }
  if (!response.body || !response.body.getReader) {
    throw new Error("ReadableStream not supported in this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

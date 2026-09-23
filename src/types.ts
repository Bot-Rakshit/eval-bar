export type GameResult = "1-0" | "0-1" | "1/2-1/2" | null;

export type SideToMove = "white" | "black" | "";

export interface GameSnapshot {
  key: string;
  whitePlayer: string;
  blackPlayer: string;
  fen: string;
  whiteClock: number;
  blackClock: number;
  turn: SideToMove;
  moveNumber: number;
  result: GameResult;
  /** Team names from team events (Olympiad etc.), empty when unavailable. */
  whiteTeam: string;
  blackTeam: string;
  /** Board number within the round (0 when unknown). */
  board: number;
  /** FIDE ratings, 0 when the source did not carry them. */
  whiteElo: number;
  blackElo: number;
}

export interface TrackedGame extends GameSnapshot {
  evaluation: number | null;
  mateIn: number | null;
  depth: number;
  alert: boolean;
  lastEvaluatedFen: string;
}

export interface RoundInfo {
  id: string;
  name: string;
  ongoing: boolean;
  finished: boolean;
  startsAt: number | null;
}

export interface TournamentSummary {
  id: string;
  name: string;
  description: string;
  image: string | null;
  url: string;
  rounds: RoundInfo[];
}

export interface BarCustomizations {
  containerBackground: string;
  containerBorderColor: string;
  whiteBarColor: string;
  blackBarColor: string;
  whitePlayerBackground: string;
  blackPlayerBackground: string;
  whitePlayerNameColor: string;
  blackPlayerNameColor: string;
  turnArrowColor: string;
  barWidth: number;
  barGap: number;
  barHeight: number;
  showClocks: boolean;
  showMoveNumber: boolean;
  sortByEval: boolean;
  hideFinished: boolean;
  layoutDirection: "row" | "column";
  showRoundName: boolean;
}

export const DEFAULT_CUSTOMIZATIONS: BarCustomizations = {
  containerBackground: "#000000",
  containerBorderColor: "#FFFFFF",
  whiteBarColor: "#ffffff",
  blackBarColor: "#E79D29",
  whitePlayerBackground: "Transparent",
  blackPlayerBackground: "Transparent",
  whitePlayerNameColor: "#FFFFFF",
  blackPlayerNameColor: "#E79D29",
  turnArrowColor: "#FFA500",
  barWidth: 13,
  barGap: 4,
  barHeight: 24,
  showClocks: true,
  showMoveNumber: true,
  sortByEval: false,
  hideFinished: false,
  layoutDirection: "row",
  showRoundName: false,
};

/**
 * Merge unknown values into a full customizations object, keeping only
 * keys that exist in the defaults with a matching type.
 */
export function mergeCustomizations(partial: Record<string, unknown> | null | undefined): BarCustomizations {
  const merged = { ...DEFAULT_CUSTOMIZATIONS };
  for (const [key, value] of Object.entries(partial ?? {})) {
    const target = key as keyof BarCustomizations;
    if (target in merged && typeof value === typeof merged[target]) {
      (merged[target] as unknown) = value;
    }
  }
  return merged;
}

export interface ShareState {
  version: 2;
  tournamentId: string;
  roundId: string;
  customizations: BarCustomizations;
  /** When set, the broadcast view only shows games involving these players. */
  players?: string[];
}

export type SelectionMode = "all" | "games" | "player";

export function makeGameKey(whitePlayer: string, blackPlayer: string): string {
  return `${whitePlayer} - ${blackPlayer}`;
}

export function emptyTrackedGame(whitePlayer: string, blackPlayer: string): TrackedGame {
  return {
    key: makeGameKey(whitePlayer, blackPlayer),
    whitePlayer,
    blackPlayer,
    fen: "",
    whiteClock: 0,
    blackClock: 0,
    turn: "",
    moveNumber: 0,
    result: null,
    whiteTeam: "",
    blackTeam: "",
    board: 0,
    whiteElo: 0,
    blackElo: 0,
    evaluation: null,
    mateIn: null,
    depth: 0,
    alert: false,
    lastEvaluatedFen: "",
  };
}

export function snapshotToTracked(snapshot: GameSnapshot, previous?: TrackedGame): TrackedGame {
  return {
    ...snapshot,
    // The round API carries ratings and the PGN stream sometimes does not;
    // a later update without them must not wipe the ones already known.
    whiteElo: snapshot.whiteElo || previous?.whiteElo || 0,
    blackElo: snapshot.blackElo || previous?.blackElo || 0,
    evaluation: previous?.evaluation ?? null,
    mateIn: previous?.mateIn ?? null,
    depth: previous?.depth ?? 0,
    alert: previous?.alert ?? false,
    lastEvaluatedFen: previous?.lastEvaluatedFen ?? "",
  };
}

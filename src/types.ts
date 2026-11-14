import { BAR_SHAPES, BarShape, CARD_FRAMES, CardFrame, CRIMSON_COLORS } from "./lib/cardTheme";

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
  /** Lichess's own ranking of the broadcast: 5 = top event, 4 = high, 3 = normal. */
  tier: number;
  /** Headline players as Lichess lists them ("Gukesh, Sindarov"), or "". */
  players: string;
}

/**
 * The broadcast view's settings. The colour keys keep their original names so
 * old links still carry their colours, but they now drive the board card:
 * containerBackground = card fill, containerBorderColor = card outline,
 * turnArrowColor = the move number in the notch.
 */
export interface BarCustomizations {
  containerBackground: string;
  containerBorderColor: string;
  whiteBarColor: string;
  blackBarColor: string;
  whitePlayerNameColor: string;
  blackPlayerNameColor: string;
  turnArrowColor: string;
  /** Card frame style (lib/cardTheme.ts CARD_FRAMES). */
  cardFrame: CardFrame;
  /** Eval bar shape (lib/cardTheme.ts BAR_SHAPES). */
  barShape: BarShape;
  /**
   * What sits behind the cards on the broadcast view: chroma green to key out
   * in OBS, or transparent for an OBS browser source to composite directly.
   */
  overlayBackground: OverlayBackground;
  /** Width of each card, as a percentage of the row. */
  barWidth: number;
  barGap: number;
  showClocks: boolean;
  showMoveNumber: boolean;
  sortByEval: boolean;
  hideFinished: boolean;
  layoutDirection: "row" | "column";
  showRoundName: boolean;
}

export const OVERLAY_BACKGROUNDS = ["chroma", "transparent"] as const;
export type OverlayBackground = (typeof OVERLAY_BACKGROUNDS)[number];

/** Crimson with the filled notch, on chroma green. */
export const DEFAULT_CUSTOMIZATIONS: BarCustomizations = {
  ...CRIMSON_COLORS,
  cardFrame: "filled",
  barShape: "pill",
  overlayBackground: "chroma",
  barWidth: 13,
  barGap: 8,
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
const ENUM_VALUES: Partial<Record<keyof BarCustomizations, readonly string[]>> = {
  cardFrame: CARD_FRAMES,
  barShape: BAR_SHAPES,
  overlayBackground: OVERLAY_BACKGROUNDS,
  layoutDirection: ["row", "column"],
};

export function mergeCustomizations(partial: Record<string, unknown> | null | undefined): BarCustomizations {
  const merged = { ...DEFAULT_CUSTOMIZATIONS };
  for (const [key, value] of Object.entries(partial ?? {})) {
    const target = key as keyof BarCustomizations;
    if (!(target in merged) || typeof value !== typeof merged[target]) continue;
    const allowed = ENUM_VALUES[target];
    if (allowed && !allowed.includes(value as string)) continue;
    (merged[target] as unknown) = value;
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

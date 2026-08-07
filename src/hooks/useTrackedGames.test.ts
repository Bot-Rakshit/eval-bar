import { renderHook } from "@testing-library/react";
import { useTrackedGames } from "./useTrackedGames";
import { GameSnapshot } from "../types";

const SNAPSHOT: GameSnapshot = {
  key: "Player A - Player B",
  whitePlayer: "Player A",
  blackPlayer: "Player B",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  whiteClock: 3600,
  blackClock: 3600,
  turn: "white",
  moveNumber: 1,
  result: null,
};
const SNAPSHOTS = new Map<string, GameSnapshot>([[SNAPSHOT.key, SNAPSHOT]]);

describe("useTrackedGames", () => {
  it("shows nothing when the selection is an empty array", () => {
    const { result } = renderHook(() => useTrackedGames(SNAPSHOTS, []));
    expect(result.current.games).toEqual([]);
  });

  it("shows all snapshot games when the selection is null", () => {
    const { result } = renderHook(() => useTrackedGames(SNAPSHOTS, null));
    expect(result.current.games.map((game) => game.key)).toEqual([SNAPSHOT.key]);
  });

  it("filters by the selected keys", () => {
    const { result } = renderHook(() => useTrackedGames(SNAPSHOTS, [SNAPSHOT.key]));
    expect(result.current.games.map((game) => game.key)).toEqual([SNAPSHOT.key]);
  });
});

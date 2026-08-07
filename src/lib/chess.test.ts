import { parseSnapshotFromPgn, snapshotFromApiGame, gameKeyFromPgn } from "./chess";

const SAMPLE_PGN = `[Event "Test Tournament"]
[Site "https://lichess.org/broadcast/test"]
[White "Carlsen, Magnus"]
[Black "Nepomniachtchi, Ian"]
[Result "*"]

1. e4 { [%clk 1:30:00] } e5 { [%clk 1:30:05] } 2. Nf3 { [%clk 1:28:30] } Nc6 { [%clk 1:29:00] } *`;

const FINISHED_PGN = `[White "Giri, Anish"]
[Black "Gukesh D"]
[Result "1-0"]

1. d4 { [%clk 0:45:00] } Nf6 { [%clk 0:44:30] } 1-0`;

describe("parseSnapshotFromPgn", () => {
  it("parses players, clocks, turn, move number and fen", () => {
    const snapshot = parseSnapshotFromPgn(SAMPLE_PGN);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.key).toBe("Carlsen, Magnus - Nepomniachtchi, Ian");
    expect(snapshot!.turn).toBe("white");
    expect(snapshot!.moveNumber).toBe(3);
    expect(snapshot!.whiteClock).toBe(1 * 3600 + 28 * 60 + 30);
    expect(snapshot!.blackClock).toBe(1 * 3600 + 29 * 60);
    expect(snapshot!.result).toBeNull();
    expect(snapshot!.fen).toBe("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3");
  });

  it("parses finished games", () => {
    const snapshot = parseSnapshotFromPgn(FINISHED_PGN);
    expect(snapshot!.result).toBe("1-0");
    expect(snapshot!.turn).toBe("white");
  });

  it("returns startpos fen for games without moves", () => {
    const snapshot = parseSnapshotFromPgn('[White "A"]\n[Black "B"]\n\n*');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("rejects pgn without players", () => {
    expect(parseSnapshotFromPgn("1. e4 e5")).toBeNull();
  });
});

describe("gameKeyFromPgn", () => {
  it("extracts the game key", () => {
    expect(gameKeyFromPgn(SAMPLE_PGN)).toBe("Carlsen, Magnus - Nepomniachtchi, Ian");
  });
});

describe("snapshotFromApiGame", () => {
  it("maps api games to snapshots", () => {
    const snapshot = snapshotFromApiGame({
      name: "So, Wesley - Caruana, Fabiano",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      players: [{ clock: 5400000 }, { clock: 5400000 }],
      status: "*",
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.whitePlayer).toBe("So, Wesley");
    expect(snapshot!.blackPlayer).toBe("Caruana, Fabiano");
    expect(snapshot!.turn).toBe("black");
    expect(snapshot!.whiteClock).toBe(5400);
    expect(snapshot!.result).toBeNull();
  });

  it("normalizes draw status", () => {
    const snapshot = snapshotFromApiGame({
      name: "A - B",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      status: "½-½",
    });
    expect(snapshot!.result).toBe("1/2-1/2");
  });

  it("rejects games without fen", () => {
    expect(snapshotFromApiGame({ name: "A - B" })).toBeNull();
  });
});

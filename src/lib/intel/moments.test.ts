import { emptyTrackedGame, TrackedGame } from "../../types";
import { detectMoments, freshMemory, projectedScore } from "./moments";
import { classifyMove, expectedScoreWhite, winPercentageFromCp } from "./winPercentage";
import { matchPredictionShare } from "../teamScore";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

function game(overrides: Partial<TrackedGame>): TrackedGame {
  return {
    ...emptyTrackedGame("Gukesh D", "Caruana, Fabiano"),
    whiteTeam: "India",
    blackTeam: "United States of America",
    fen: START,
    depth: 20,
    evaluation: 0.2,
    moveNumber: 1,
    ...overrides,
  };
}

describe("win percentage", () => {
  it("is 50 at equality and symmetric", () => {
    expect(winPercentageFromCp(0)).toBeCloseTo(50);
    expect(winPercentageFromCp(300) + winPercentageFromCp(-300)).toBeCloseTo(100);
  });

  it("classifies a 20+ point drop for the mover as a blunder", () => {
    expect(classifyMove(55, 30, true)).toBe("blunder");
    expect(classifyMove(45, 70, false)).toBe("blunder");
    expect(classifyMove(50, 48, true)).toBe("ok");
  });
});

describe("detectMoments", () => {
  it("calls a blunder by the side that just moved, toned against the team", () => {
    const memory = freshMemory();
    detectMoments(game({ fen: START, evaluation: 0.2 }), memory, "India");
    const moments = detectMoments(game({ fen: AFTER_E4, evaluation: -2.5 }), memory, "India");
    expect(moments[0].text).toBe("Blunder by Gukesh");
    expect(moments[0].tone).toBe("bad");
  });

  it("does not fire eval moments before the engine has settled", () => {
    const memory = freshMemory();
    detectMoments(game({ fen: START, evaluation: 0.2 }), memory, "India");
    expect(detectMoments(game({ fen: AFTER_E4, evaluation: -2.5, depth: 5 }), memory, "India")).toEqual([]);
  });

  it("announces the result once", () => {
    const memory = freshMemory();
    const first = detectMoments(game({ result: "1-0" }), memory, "India");
    expect(first[0].text).toBe("Gukesh wins");
    expect(first[0].tone).toBe("good");
    expect(detectMoments(game({ result: "1-0" }), memory, "India")).toEqual([]);
  });

  it("flags time trouble then under a minute", () => {
    const memory = freshMemory();
    expect(detectMoments(game({ blackClock: 250, whiteClock: 3000 }), memory, "India")[0].text).toBe(
      "Caruana in time trouble"
    );
    expect(detectMoments(game({ blackClock: 40, whiteClock: 3000 }), memory, "India")[0].text).toBe(
      "Caruana under a minute"
    );
  });
});

describe("projectedScore", () => {
  it("combines finished results with live win chances", () => {
    const games = [game({ result: "1-0" }), game({ evaluation: 0 })];
    expect(projectedScore(games, "India")).toEqual({ us: 1.5, them: 0.5 });
  });
});

describe("expectedScoreWhite", () => {
  it("matches the fitted model", () => {
    // Gukesh (2703) v Abdusattorov (2762), +0.8 at move 23 — reference value from the Python fit
    expect(expectedScoreWhite(0.8, null, 2703, 2762, 23)).toBeCloseTo(0.5751, 3);
  });

  it("gives a big rating gap most of the points from an equal start", () => {
    expect(expectedScoreWhite(0, null, 2760, 2360, 1)).toBeCloseTo(0.918, 2);
  });

  it("fades the rating term as the game goes on", () => {
    const early = expectedScoreWhite(0, null, 2760, 2360, 1);
    const late = expectedScoreWhite(0, null, 2760, 2360, 60);
    expect(late).toBeLessThan(early);
    expect(late).toBeGreaterThan(0.5);
  });

  it("ignores ratings when either is unknown", () => {
    expect(expectedScoreWhite(0.5, null, 2760, 0, 10)).toBeCloseTo(expectedScoreWhite(0.5, null, 0, 0, 10));
  });

  it("treats a found mate as decided", () => {
    expect(expectedScoreWhite(null, 3, 2000, 2800, 30)).toBe(1);
    expect(expectedScoreWhite(null, -2, 2800, 2000, 30)).toBe(0);
  });
});

describe("match prediction bar", () => {
  const board = (evaluation: number | null, overrides: Partial<TrackedGame> = {}) => game({ evaluation, ...overrides });
  const share = (games: TrackedGame[]) => matchPredictionShare(games, "India");
  const usAsBlack = { whiteTeam: "United States of America", blackTeam: "India" };

  it("reads full for two winning boards and two equal ones — about 3–1", () => {
    expect(share([board(2.5), board(3), board(0.1), board(-0.2)])).toBe(1);
  });

  it("reads half for two winning and two losing — heading for 2–2", () => {
    expect(share([board(2.5), board(3), board(-2.5), board(-3)])).toBeCloseTo(0.5);
  });

  it("sits level before the round, when no board has an eval", () => {
    expect(share([board(null), board(null), board(null), board(null)])).toBeCloseTo(0.5);
  });

  it("tells slightly better from better from winning", () => {
    const one = (evaluation: number) => share([board(evaluation), board(0), board(0), board(0)]);
    expect(one(0.5)).toBeCloseTo(0.6); // slightly better
    expect(one(1.0)).toBeCloseTo(0.75); // clearly better
    expect(one(2.0)).toBeCloseTo(0.9); // winning
  });

  it("reads each board from India's side, whichever colour India has", () => {
    // India has Black and White is -2.5: India is winning those two
    expect(share([board(-2.5, usAsBlack), board(-3, usAsBlack), board(0), board(0)])).toBe(1);
  });

  it("counts finished games as their result", () => {
    // Already 2½ of 4: decided, whatever the live boards say
    expect(share([board(0, { result: "1-0" }), board(0, { result: "1-0" }), board(0, { result: "1/2-1/2" }), board(-5)])).toBe(1);
  });
});

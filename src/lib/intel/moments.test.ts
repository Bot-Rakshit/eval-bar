import { emptyTrackedGame, TrackedGame } from "../../types";
import { detectMoments, freshMemory, projectedScore } from "./moments";
import { classifyMove, winPercentageFromCp } from "./winPercentage";

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

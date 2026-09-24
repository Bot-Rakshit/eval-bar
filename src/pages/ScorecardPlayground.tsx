import { useMemo, useState } from "react";
import Scorecard from "../components/Scorecard";
import { emptyTrackedGame, GameResult, TrackedGame } from "../types";
import { evalBand, matchPredictionShare, predictedBoardPoints } from "../lib/teamScore";
import "./ScorecardPlayground.css";

/**
 * /scorecard/play — four boards to set by hand, beside the real scorecard, to
 * see how the bar reads a match. Evals are from India's side (+ is India
 * better); every board is played as India with White so the eval passes
 * through unchanged. Nothing here touches the network.
 */

const TEAM = "India";
const OPPONENT = "Uzbekistan";

type BoardResult = "live" | "win" | "draw" | "loss";

interface Board {
  evaluation: number;
  result: BoardResult;
}

const RESULTS: Record<BoardResult, GameResult> = { live: null, win: "1-0", draw: "1/2-1/2", loss: "0-1" };
const RESULT_LABELS: Record<BoardResult, string> = { live: "Live", win: "India won", draw: "Draw", loss: "India lost" };

const level = (): Board[] => [0, 0, 0, 0].map((evaluation) => ({ evaluation, result: "live" as BoardResult }));
const live = (...evals: number[]): Board[] => evals.map((evaluation) => ({ evaluation, result: "live" as BoardResult }));

const PRESETS: Array<{ name: string; boards: Board[] }> = [
  { name: "All level", boards: level() },
  { name: "2 winning, 2 equal", boards: live(2.5, 3, 0.1, -0.2) },
  { name: "2 winning, 2 losing", boards: live(2.5, 3, -2.5, -3) },
  { name: "1 slightly better", boards: live(0.5, 0, 0, 0) },
  { name: "1 clearly better", boards: live(1, 0, 0, 0) },
  { name: "1 winning", boards: live(2, 0, 0, 0) },
  {
    name: "1–0 up, rest level",
    boards: [{ evaluation: 0, result: "win" }, ...live(0, 0, 0)],
  },
  {
    name: "2–1 up, last level",
    boards: [
      { evaluation: 0, result: "win" },
      { evaluation: 0, result: "win" },
      { evaluation: 0, result: "loss" },
      ...live(0),
    ],
  },
];

function toGame(board: Board, index: number): TrackedGame {
  return {
    ...emptyTrackedGame(`India ${index + 1}`, `Opponent ${index + 1}`),
    whiteTeam: TEAM,
    blackTeam: OPPONENT,
    evaluation: board.result === "live" ? board.evaluation : null,
    result: RESULTS[board.result],
    depth: 20,
    board: index + 1,
  };
}

/** How the bar reads this board, in words. */
function reading(board: Board): string {
  if (board.result !== "live") return RESULT_LABELS[board.result];
  const band = evalBand(board.evaluation);
  if (band.label === "Equal") return "Equal";
  return `${band.label} — ${board.evaluation > 0 ? "India" : "opponent"}`;
}

const formatEval = (value: number) => (value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1));
/** 0.75 → "0.75", 0.5 → "0.5", 1 → "1" */
const trim = (value: number) => String(Math.round(value * 100) / 100);

export default function ScorecardPlayground() {
  const [boards, setBoards] = useState<Board[]>(level);
  const games = useMemo(() => boards.map(toGame), [boards]);

  const update = (index: number, patch: Partial<Board>) =>
    setBoards((current) => current.map((board, i) => (i === index ? { ...board, ...patch } : board)));

  const predicted = games.reduce((sum, game) => sum + predictedBoardPoints(game, TEAM), 0);
  const share = matchPredictionShare(games, TEAM);

  return (
    <div className="play-page">
      <section className="play-controls">
        <header>
          <h1>Scorecard playground</h1>
          <p>Set four boards and watch the bar. Evals are from India's side: + means India is better.</p>
        </header>

        <div className="play-presets">
          {PRESETS.map((preset) => (
            <button key={preset.name} type="button" onClick={() => setBoards(preset.boards.map((b) => ({ ...b })))}>
              {preset.name}
            </button>
          ))}
        </div>

        {boards.map((board, index) => {
          const points = predictedBoardPoints(games[index], TEAM);
          return (
            <div className="play-board" key={index}>
              <div className="play-board-head">
                <span className="play-board-name">Board {index + 1}</span>
                <span className="play-board-reading">{reading(board)}</span>
                <span className="play-board-points">counts {trim(points)}</span>
              </div>
              <div className="play-board-row">
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={board.evaluation}
                  disabled={board.result !== "live"}
                  onChange={(event) => update(index, { evaluation: Number(event.target.value) })}
                  aria-label={`Board ${index + 1} eval`}
                />
                <span className="play-eval">{board.result === "live" ? formatEval(board.evaluation) : "—"}</span>
                <select
                  value={board.result}
                  onChange={(event) => update(index, { result: event.target.value as BoardResult })}
                  aria-label={`Board ${index + 1} result`}
                >
                  {(Object.keys(RESULT_LABELS) as BoardResult[]).map((key) => (
                    <option key={key} value={key}>
                      {RESULT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        <dl className="play-summary">
          <div>
            <dt>Predicted</dt>
            <dd>
              {trim(predicted)} – {trim(games.length - predicted)}
            </dd>
          </div>
          <div>
            <dt>Bar</dt>
            <dd>{Math.round(share * 100)}% India</dd>
          </div>
        </dl>
        <p className="play-note">
          Bar is half at a predicted 2–2, full at 2½ or more, empty at 1½ or less. Equal counts ½, slightly
          better 0.6, clearly better 0.75, winning 0.9, a finished game its result.
        </p>
      </section>

      <section className="play-preview">
        <div className="play-preview-scale">
          <Scorecard games={games} team={TEAM} section="Open" />
        </div>
      </section>
    </div>
  );
}

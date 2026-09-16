import { TrackedGame, emptyTrackedGame } from "../../types";
import { Moment, MomentTone } from "./moments";

/** Scripted boards + callouts so the overlay can be previewed without a live round. */

const OPPONENT = "Uzbekistan";

function board(
  white: string,
  black: string,
  whiteTeam: string,
  blackTeam: string,
  evaluation: number,
  moveNumber: number,
  whiteClock: number,
  blackClock: number
): TrackedGame {
  return {
    ...emptyTrackedGame(white, black),
    fen: "r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R2QK2R w KQ - 0 9",
    whiteTeam,
    blackTeam,
    evaluation,
    depth: 20,
    moveNumber,
    whiteClock,
    blackClock,
    turn: "white",
    board: 1,
  };
}

export function demoGames(team: string): TrackedGame[] {
  return [
    board("Gukesh D", "Abdusattorov, Nodirbek", team, OPPONENT, 0.8, 23, 3541, 2988),
    board("Sindarov, Javokhir", "Erigaisi Arjun", OPPONENT, team, -1.6, 31, 1210, 2400),
    board("Praggnanandhaa R", "Yakubboev, Nodirbek", team, OPPONENT, 0.1, 18, 4100, 3900),
    board("Vokhidov, Shamsiddin", "Vidit, Santosh Gujrathi", OPPONENT, team, 2.4, 37, 240, 55),
  ];
}

interface Step {
  boardIndex: number;
  text: string;
  tone: MomentTone;
}

/** One of every callout the detector can produce, in broadcast order. */
export const DEMO_SCRIPT: Step[] = [
  { boardIndex: 1, text: "Blunder by Abdusattorov", tone: "good" },
  { boardIndex: 2, text: "Mate in 12 for Kulpruethanon", tone: "bad" },
  { boardIndex: 3, text: "Vidit under a minute", tone: "alert" },
  { boardIndex: 0, text: "Gukesh is winning", tone: "good" },
  { boardIndex: 1, text: "Mistake by Arjun", tone: "bad" },
  { boardIndex: 2, text: "Pragg in time trouble", tone: "alert" },
  { boardIndex: 0, text: "Mate in 4 for Gukesh", tone: "good" },
  { boardIndex: 1, text: "Sindarov is winning", tone: "bad" },
  { boardIndex: 0, text: "Gukesh wins", tone: "good" },
  { boardIndex: 3, text: "Vidit draws", tone: "neutral" },
  { boardIndex: 1, text: "Sindarov wins", tone: "bad" },
];

export function demoMoment(step: Step, index: number): Moment {
  return {
    id: `demo-${index}`,
    kind: "demo",
    text: step.text,
    tone: step.tone,
    priority: 0,
    durationMs: 4500,
  };
}

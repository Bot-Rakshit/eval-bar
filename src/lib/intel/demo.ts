import { GameResult, TrackedGame, emptyTrackedGame } from "../../types";
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
  blackClock: number,
  whiteElo: number,
  blackElo: number,
  result: GameResult = null
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
    whiteElo,
    blackElo,
    result,
  };
}

export function demoGames(team: string): TrackedGame[] {
  return [
    // Ratings are the players' real ones from the 46th Olympiad PGNs
    // Clocks match the demo's callouts: Abdusattorov is under a minute,
    // Yakubboev in time trouble
    board("Gukesh D", "Abdusattorov, Nodirbek", team, OPPONENT, 0.8, 23, 3541, 48, 2703, 2762),
    board("Sindarov, Javokhir", "Erigaisi Arjun", OPPONENT, team, -1.6, 31, 1210, 2400, 2778, 2759),
    board("Praggnanandhaa R", "Yakubboev, Nodirbek", team, OPPONENT, 0.1, 18, 4100, 212, 2761, 2685),
    // One decided board, so the result state can be previewed too
    board("Vokhidov, Shamsiddin", "Vidit, Santosh Gujrathi", OPPONENT, team, 2.4, 37, 240, 55, 2654, 2697, "0-1"),
  ];
}

interface Step {
  boardIndex: number;
  label: string;
  subject: string;
  side: "white" | "black";
  tone: MomentTone;
}

/**
 * One of every callout the detector can produce, each about a player who is
 * actually on that demo board. Tones are from the followed team's side.
 */
export const DEMO_SCRIPT: Step[] = [
  { boardIndex: 0, label: "Blunder", subject: "Abdusattorov", side: "black", tone: "good" },
  { boardIndex: 1, label: "Winning", subject: "Arjun", side: "black", tone: "good" },
  { boardIndex: 2, label: "Time trouble", subject: "Yakubboev", side: "black", tone: "alert" },
  { boardIndex: 0, label: "Mate in 4", subject: "Gukesh", side: "white", tone: "good" },
  { boardIndex: 1, label: "Mistake", subject: "Sindarov", side: "white", tone: "good" },
  { boardIndex: 3, label: "Win", subject: "Vidit", side: "black", tone: "good" },
  { boardIndex: 2, label: "Draw", subject: "Pragg", side: "white", tone: "neutral" },
  { boardIndex: 0, label: "Under a minute", subject: "Abdusattorov", side: "black", tone: "alert" },
];

export function demoMoment(step: Step, index: number): Moment {
  return {
    id: `demo-${index}`,
    kind: "demo",
    text: `${step.label} — ${step.subject}`,
    label: step.label,
    subject: step.subject,
    side: step.side,
    tone: step.tone,
    priority: 0,
    durationMs: 5000,
  };
}

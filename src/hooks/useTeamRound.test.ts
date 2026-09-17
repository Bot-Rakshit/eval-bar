import { candidateRounds } from "./useTeamRound";
import { RoundInfo } from "../types";

const HOUR = 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

function round(id: string, startsAt: number, flags: Partial<RoundInfo> = {}): RoundInfo {
  return { id, name: id, ongoing: false, finished: false, startsAt, ...flags };
}

const ROUNDS = [
  round("r1", T0, { finished: true }),
  round("r2", T0 + 24 * HOUR),
  round("r3", T0 + 48 * HOUR),
];

describe("candidateRounds", () => {
  it("prefers the ongoing round", () => {
    const rounds = [round("r1", T0, { finished: true }), round("r2", T0 + 24 * HOUR, { ongoing: true })];
    expect(candidateRounds(rounds, T0 + 25 * HOUR).map((r) => r.id)).toEqual(["r2"]);
  });

  it("keeps showing last results while the next round is far away", () => {
    expect(candidateRounds(ROUNDS, T0 + 8 * HOUR).map((r) => r.id)).toEqual(["r1"]);
  });

  it("switches to the next round's fixtures when it is close, falling back to results", () => {
    expect(candidateRounds(ROUNDS, T0 + 20 * HOUR).map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("after the scheduled start, tries the new round then the previous one", () => {
    expect(candidateRounds(ROUNDS, T0 + 24.5 * HOUR).map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("uses the first round before the event starts", () => {
    expect(candidateRounds(ROUNDS, T0 - 30 * HOUR).map((r) => r.id)).toEqual(["r1"]);
  });
});

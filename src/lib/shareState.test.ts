import { decodeShareState, encodeShareState } from "./shareState";
import { DEFAULT_CUSTOMIZATIONS } from "../types";

const LEGACY_LINK =
  "eyJ0b3VybmFtZW50SWQiOiJkNjNQdkVtYSIsInJvdW5kSWQiOiJ4cWxKRnlkSyIsImdhbWVJRHMiOlsiU28sIFdlc2xleS12cy1DYXJ1YW5hLCBGYWJpYW5vIl0sImN1c3RvbVN0eWxlcyI6eyJldmFsQ29udGFpbmVyQmciOiIjMDAwMDAwIiwiYmxhY2tCYXJDb2xvciI6IiNFNzlEMjkiLCJ3aGl0ZUJhckNvbG9yIjoiI2ZmZmZmZiIsIndoaXRlUGxheWVyQ29sb3IiOiJUcmFuc3BhcmVudCIsImJsYWNrUGxheWVyQ29sb3IiOiJUcmFuc3BhcmVudCIsIndoaXRlUGxheWVyTmFtZUNvbG9yIjoiI0ZGRkZGRiIsImJsYWNrUGxheWVyTmFtZUNvbG9yIjoiI0U3OUQyOSIsImV2YWxDb250YWluZXJCb3JkZXJDb2xvciI6IiNGRkZGRkYiLCJtb3ZlSW5kaWNhdG9yQXJyb3dDb2xvciI6IiNGRkE1MDAifX0=";

describe("decodeShareState", () => {
  it("migrates legacy v1 links", () => {
    const state = decodeShareState(LEGACY_LINK);
    expect(state).not.toBeNull();
    expect(state!.tournamentId).toBe("d63PvEma");
    expect(state!.roundId).toBe("xqlJFydK");
    expect(state!.customizations.containerBackground).toBe("#000000");
    expect(state!.customizations.blackBarColor).toBe("#E79D29");
    expect(state!.customizations.whitePlayerBackground).toBe("Transparent");
    expect(state!.customizations.turnArrowColor).toBe("#FFA500");
    expect(state!.customizations.barWidth).toBe(DEFAULT_CUSTOMIZATIONS.barWidth);
    expect(state!.customizations.showClocks).toBe(true);
  });

  it("round-trips v2 state", () => {
    const original = {
      version: 2 as const,
      tournamentId: "abc",
      roundId: "def",
      customizations: { ...DEFAULT_CUSTOMIZATIONS, barWidth: 20, showClocks: false },
    };
    const decoded = decodeShareState(encodeShareState(original));
    expect(decoded).toEqual(original);
  });

  it("rejects garbage", () => {
    expect(decodeShareState("not-base64!!!")).toBeNull();
    expect(decodeShareState(btoa('{"foo":1}'))).toBeNull();
  });
});

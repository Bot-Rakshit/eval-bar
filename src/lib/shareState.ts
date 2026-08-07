import { BarCustomizations, mergeCustomizations, ShareState } from "../types";

/** Old (v1) links used different customization key names — map them across. */
const LEGACY_KEY_MAP: Record<string, keyof BarCustomizations> = {
  evalContainerBg: "containerBackground",
  evalContainerBorderColor: "containerBorderColor",
  whitePlayerColor: "whitePlayerBackground",
  blackPlayerColor: "blackPlayerBackground",
  moveIndicatorArrowColor: "turnArrowColor",
};

function normalizeCustomizationKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    normalized[LEGACY_KEY_MAP[key] ?? key] = value;
  }
  return normalized;
}

export function encodeShareState(state: ShareState): string {
  return btoa(JSON.stringify(state));
}

export function decodeShareState(encoded: string): ShareState | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(atob(encoded));
  } catch {
    return null;
  }

  const tournamentId = parsed.tournamentId;
  const roundId = parsed.roundId;
  if (typeof tournamentId !== "string" || typeof roundId !== "string") {
    return null;
  }

  const rawCustomizations = (parsed.customizations ?? parsed.customStyles ?? {}) as Record<string, unknown>;

  return {
    version: 2,
    tournamentId,
    roundId,
    customizations: mergeCustomizations(normalizeCustomizationKeys(rawCustomizations)),
  };
}

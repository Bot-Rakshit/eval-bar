import { BarCustomizations, DEFAULT_CUSTOMIZATIONS, ShareState } from "../types";

const LEGACY_KEY_MAP: Record<string, keyof BarCustomizations> = {
  evalContainerBg: "containerBackground",
  containerBorderColor: "containerBorderColor",
  evalContainerBorderColor: "containerBorderColor",
  whiteBarColor: "whiteBarColor",
  blackBarColor: "blackBarColor",
  whitePlayerColor: "whitePlayerBackground",
  blackPlayerColor: "blackPlayerBackground",
  whitePlayerNameColor: "whitePlayerNameColor",
  blackPlayerNameColor: "blackPlayerNameColor",
  moveIndicatorArrowColor: "turnArrowColor",
};

function migrateLegacyCustomizations(legacy: Record<string, unknown>): BarCustomizations {
  const customizations = { ...DEFAULT_CUSTOMIZATIONS };
  for (const [legacyKey, value] of Object.entries(legacy ?? {})) {
    const targetKey = LEGACY_KEY_MAP[legacyKey] ?? (legacyKey as keyof BarCustomizations);
    if (targetKey in customizations && typeof value === typeof customizations[targetKey]) {
      (customizations[targetKey] as unknown) = value;
    }
  }
  return customizations;
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
    customizations: migrateLegacyCustomizations(rawCustomizations),
  };
}

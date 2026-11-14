import { CRIMSON_COLORS, NEUTRAL_COLORS, OLYMPIAD_COLORS, THEME_PRESETS, cardThemeVars, isReddish, matchesPreset, warningColors } from "./cardTheme";
import { DEFAULT_CUSTOMIZATIONS, mergeCustomizations } from "../types";

describe("warningColors", () => {
  it("switches the alert and low clock to amber on red palettes", () => {
    expect(warningColors(CRIMSON_COLORS)).toEqual({ alert: "#ffb020", clockLow: "#ffb020" });
  });

  it("keeps them red elsewhere", () => {
    for (const colors of [NEUTRAL_COLORS, OLYMPIAD_COLORS]) {
      expect(warningColors(colors).alert).toBe("#ff3b30");
    }
    const cbi = THEME_PRESETS.find((preset) => preset.name === "CBI")!;
    expect(warningColors(cbi.colors).alert).toBe("#ff3b30"); // orange is not red
  });

  it("reaches the card tokens", () => {
    const vars = cardThemeVars(CRIMSON_COLORS) as Record<string, string>;
    expect(vars["--alert"]).toBe("#ffb020");
    expect(vars["--clock-low"]).toBe("#ffb020");
  });

  it("reads red hues, not greys, oranges or pinks far from red", () => {
    expect(isReddish("#e5484d")).toBe(true);
    expect(isReddish("#1c0a0d")).toBe(true);
    expect(isReddish("#8a8f98")).toBe(false);
    expect(isReddish("#E79D29")).toBe(false);
    expect(isReddish("#a78bfa")).toBe(false);
  });
});

describe("defaults", () => {
  it("are Crimson with the filled notch on chroma green", () => {
    expect(matchesPreset(DEFAULT_CUSTOMIZATIONS, THEME_PRESETS[0])).toBe(true);
    expect(THEME_PRESETS[0].name).toBe("Crimson");
    expect(DEFAULT_CUSTOMIZATIONS.cardFrame).toBe("filled");
    expect(DEFAULT_CUSTOMIZATIONS.barShape).toBe("pill");
    expect(DEFAULT_CUSTOMIZATIONS.overlayBackground).toBe("chroma");
  });

  it("reject unknown frame, bar and background values from links and files", () => {
    const merged = mergeCustomizations({ cardFrame: "neon", barShape: "slim", overlayBackground: "blue" });
    expect(merged.cardFrame).toBe("filled");
    expect(merged.barShape).toBe("slim");
    expect(merged.overlayBackground).toBe("chroma");
  });
});

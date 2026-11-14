import { ChangeEvent, CSSProperties, ReactNode, useMemo, useRef, useState } from "react";
import { MuiColorInput } from "mui-color-input";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import { BarCustomizations, DEFAULT_CUSTOMIZATIONS, emptyTrackedGame, mergeCustomizations, TrackedGame } from "../types";
import {
  BAR_LABELS,
  BAR_SHAPES,
  CARD_FRAMES,
  cardStyleClass,
  cardThemeVars,
  FRAME_LABELS,
  matchesPreset,
  THEME_PRESETS,
} from "../lib/cardTheme";
import OlympiadCard from "./OlympiadCard";

interface CustomizePanelProps {
  customizations: BarCustomizations;
  onChange: (next: BarCustomizations) => void;
  /** Start with the panel open. */
  defaultOpen?: boolean;
}

interface ColorFieldDef {
  key: keyof BarCustomizations;
  label: string;
}

const COLOR_SECTIONS: Array<{ title: string; fields: ColorFieldDef[] }> = [
  {
    title: "Card",
    fields: [
      { key: "containerBackground", label: "Card" },
      { key: "containerBorderColor", label: "Outline and tab" },
      { key: "turnArrowColor", label: "Move number" },
    ],
  },
  {
    title: "Eval bar",
    fields: [
      { key: "whiteBarColor", label: "White side" },
      { key: "blackBarColor", label: "Black side" },
    ],
  },
  {
    title: "Players",
    fields: [
      { key: "whitePlayerNameColor", label: "White name and clock" },
      { key: "blackPlayerNameColor", label: "Black name and clock" },
    ],
  },
];

/** The board every tile shows: White a little better, mid-game. */
const SAMPLE_GAME: TrackedGame = {
  ...emptyTrackedGame("Gukesh D", "Caruana, Fabiano"),
  evaluation: 1.4,
  depth: 20,
  moveNumber: 27,
  whiteClock: 3125,
  blackClock: 2871,
  turn: "white",
};

/** A live card, shrunk to fit a picker tile. */
function MiniCard({ className, style }: { className: string; style: CSSProperties }) {
  return (
    <span className="look-tile-card">
      <OlympiadCard game={SAMPLE_GAME} board={1} className={className} style={style} freezeClocks />
    </span>
  );
}

function LookTile({
  selected,
  label,
  hint,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={selected ? "look-tile selected" : "look-tile"}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
      <span className="look-tile-label">{label}</span>
      {hint && <span className="look-tile-hint">{hint}</span>}
    </button>
  );
}

export function CustomizePanel({ customizations, onChange, defaultOpen = false }: CustomizePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<BarCustomizations>) => {
    onChange({ ...customizations, ...partial });
  };

  const styleClass = cardStyleClass(customizations.cardFrame, customizations.barShape);
  const currentVars = useMemo(() => cardThemeVars(customizations), [customizations]);
  const presetVars = useMemo(() => THEME_PRESETS.map((preset) => cardThemeVars(preset.colors)), []);
  const isCustomPalette = !THEME_PRESETS.some((preset) => matchesPreset(customizations, preset));

  const exportTheme = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(customizations, null, 2))}`;
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "eval-bar-theme.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const importTheme = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as Record<string, unknown>;
        onChange(mergeCustomizations(imported));
      } catch {
        console.error("Invalid theme file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="customize-panel">
      <button type="button" className="action-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Hide look settings" : "Change look"}
      </button>
      <button type="button" className="action-btn" onClick={() => fileInputRef.current?.click()}>
        Import Theme
      </button>
      <button type="button" className="action-btn" onClick={exportTheme}>
        Export Theme
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={importTheme}
      />

      {isOpen && (
        <div className="customize-content">
          <div className="customize-section">
            <span className="control-label">
              Theme{isCustomPalette ? " · custom colours" : ""}
            </span>
            <div className="look-grid">
              {THEME_PRESETS.map((preset, index) => (
                <LookTile
                  key={preset.name}
                  label={preset.name}
                  hint={preset.note}
                  selected={matchesPreset(customizations, preset)}
                  onClick={() => patch(preset.colors)}
                >
                  <MiniCard className={styleClass} style={presetVars[index]} />
                </LookTile>
              ))}
            </div>
          </div>

          <div className="customize-section">
            <span className="control-label">Frame</span>
            <div className="look-grid">
              {CARD_FRAMES.map((frame) => (
                <LookTile
                  key={frame}
                  label={FRAME_LABELS[frame]}
                  hint={frame === "glass" ? "Needs the Transparent background in OBS" : undefined}
                  selected={customizations.cardFrame === frame}
                  onClick={() =>
                    patch(
                      // Glass only works composited with alpha, so pick that too
                      frame === "glass" ? { cardFrame: frame, overlayBackground: "transparent" } : { cardFrame: frame }
                    )
                  }
                >
                  <MiniCard className={cardStyleClass(frame, customizations.barShape)} style={currentVars} />
                </LookTile>
              ))}
            </div>
          </div>

          <div className="customize-section">
            <span className="control-label">Eval bar</span>
            <div className="look-grid">
              {BAR_SHAPES.map((shape) => (
                <LookTile
                  key={shape}
                  label={BAR_LABELS[shape]}
                  selected={customizations.barShape === shape}
                  onClick={() => patch({ barShape: shape })}
                >
                  <MiniCard className={cardStyleClass(customizations.cardFrame, shape)} style={currentVars} />
                </LookTile>
              ))}
            </div>
          </div>

          <div className="customize-section">
            <span className="control-label">Layout</span>
            <div className="preset-row" style={{ marginBottom: "14px" }}>
              <button
                type="button"
                className={customizations.layoutDirection === "row" ? "action-btn primary" : "action-btn"}
                onClick={() => patch({ layoutDirection: "row" })}
              >
                Horizontal rows
              </button>
              <button
                type="button"
                className={customizations.layoutDirection === "column" ? "action-btn primary" : "action-btn"}
                onClick={() => patch({ layoutDirection: "column" })}
              >
                Vertical column
              </button>
            </div>
            <div className="customize-grid">
              <div className="customize-field">
                <span className="customize-field-label">Card width — {customizations.barWidth}%</span>
                <Slider
                  size="small"
                  min={8}
                  max={32}
                  step={1}
                  value={customizations.barWidth}
                  onChange={(_, value) => patch({ barWidth: value as number })}
                />
              </div>
              <div className="customize-field">
                <span className="customize-field-label">Gap — {customizations.barGap}px</span>
                <Slider
                  size="small"
                  min={0}
                  max={24}
                  step={1}
                  value={customizations.barGap}
                  onChange={(_, value) => patch({ barGap: value as number })}
                />
              </div>
              <div className="customize-field customize-toggle">
                <span className="customize-field-label">Show clocks</span>
                <Switch
                  size="small"
                  checked={customizations.showClocks}
                  onChange={(_, checked) => patch({ showClocks: checked })}
                />
              </div>
              <div className="customize-field customize-toggle">
                <span className="customize-field-label">Show move number</span>
                <Switch
                  size="small"
                  checked={customizations.showMoveNumber}
                  onChange={(_, checked) => patch({ showMoveNumber: checked })}
                />
              </div>
              <div className="customize-field customize-toggle">
                <span className="customize-field-label">Sort by evaluation</span>
                <Switch
                  size="small"
                  checked={customizations.sortByEval}
                  onChange={(_, checked) => patch({ sortByEval: checked })}
                />
              </div>
              <div className="customize-field customize-toggle">
                <span className="customize-field-label">Hide finished games</span>
                <Switch
                  size="small"
                  checked={customizations.hideFinished}
                  onChange={(_, checked) => patch({ hideFinished: checked })}
                />
              </div>
              <div className="customize-field customize-toggle">
                <span className="customize-field-label">Show round name on overlay</span>
                <Switch
                  size="small"
                  checked={customizations.showRoundName}
                  onChange={(_, checked) => patch({ showRoundName: checked })}
                />
              </div>
            </div>
          </div>

          <details className="customize-section customize-details">
            <summary className="control-label">Fine-tune colours</summary>
            {COLOR_SECTIONS.map((section) => (
              <div className="customize-subsection" key={section.title}>
                <span className="customize-field-label">{section.title}</span>
                <div className="customize-grid">
                  {section.fields.map((field) => (
                    <div className="customize-field" key={field.key}>
                      <span className="customize-field-label">{field.label}</span>
                      <MuiColorInput
                        size="small"
                        format="hex"
                        value={customizations[field.key] as string}
                        onChange={(color) => patch({ [field.key]: color } as Partial<BarCustomizations>)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </details>

          <button
            type="button"
            className="action-btn"
            onClick={() => onChange({ ...DEFAULT_CUSTOMIZATIONS })}
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomizePanel;

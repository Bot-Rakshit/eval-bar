import { ChangeEvent, useRef, useState } from "react";
import { MuiColorInput } from "mui-color-input";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import { BarCustomizations, DEFAULT_CUSTOMIZATIONS, mergeCustomizations } from "../types";

interface CustomizePanelProps {
  customizations: BarCustomizations;
  onChange: (next: BarCustomizations) => void;
}

interface ColorFieldDef {
  key: keyof BarCustomizations;
  label: string;
}

const COLOR_SECTIONS: Array<{ title: string; fields: ColorFieldDef[] }> = [
  {
    title: "Eval bar",
    fields: [
      { key: "whiteBarColor", label: "White bar" },
      { key: "blackBarColor", label: "Black bar" },
    ],
  },
  {
    title: "Players",
    fields: [
      { key: "whitePlayerNameColor", label: "White name" },
      { key: "blackPlayerNameColor", label: "Black name" },
      { key: "whitePlayerBackground", label: "White name background" },
      { key: "blackPlayerBackground", label: "Black name background" },
    ],
  },
  {
    title: "Container",
    fields: [
      { key: "containerBackground", label: "Background" },
      { key: "containerBorderColor", label: "Border" },
      { key: "turnArrowColor", label: "Turn arrow" },
    ],
  },
];

const THEME_PRESETS: Array<{ name: string; colors: Partial<BarCustomizations> }> = [
  {
    name: "CBI",
    colors: {
      containerBackground: "#000000",
      containerBorderColor: "#FFFFFF",
      whiteBarColor: "#ffffff",
      blackBarColor: "#E79D29",
      whitePlayerBackground: "Transparent",
      blackPlayerBackground: "Transparent",
      whitePlayerNameColor: "#FFFFFF",
      blackPlayerNameColor: "#E79D29",
      turnArrowColor: "#FFA500",
    },
  },
  {
    name: "Lichess",
    colors: {
      containerBackground: "#262421",
      containerBorderColor: "#3c3834",
      whiteBarColor: "#ffffff",
      blackBarColor: "#4d4d4d",
      whitePlayerBackground: "Transparent",
      blackPlayerBackground: "Transparent",
      whitePlayerNameColor: "#ffffff",
      blackPlayerNameColor: "#bfbfbf",
      turnArrowColor: "#7fa650",
    },
  },
  {
    name: "Chess.com",
    colors: {
      containerBackground: "#312e2b",
      containerBorderColor: "#403d39",
      whiteBarColor: "#f9f9f9",
      blackBarColor: "#564f4a",
      whitePlayerBackground: "Transparent",
      blackPlayerBackground: "Transparent",
      whitePlayerNameColor: "#ffffff",
      blackPlayerNameColor: "#c9c7c5",
      turnArrowColor: "#81b64c",
    },
  },
  {
    name: "Midnight",
    colors: {
      containerBackground: "#0d1117",
      containerBorderColor: "#30363d",
      whiteBarColor: "#58a6ff",
      blackBarColor: "#161b22",
      whitePlayerBackground: "Transparent",
      blackPlayerBackground: "Transparent",
      whitePlayerNameColor: "#e6edf3",
      blackPlayerNameColor: "#79c0ff",
      turnArrowColor: "#d29922",
    },
  },
];

export function CustomizePanel({ customizations, onChange }: CustomizePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<BarCustomizations>) => {
    onChange({ ...customizations, ...partial });
  };

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
        {isOpen ? "Hide Customization" : "Customize Bars"}
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
            <span className="control-label">Theme presets</span>
            <div className="preset-row">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="action-btn"
                  onClick={() => patch(preset.colors)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {COLOR_SECTIONS.map((section) => (
            <div className="customize-section" key={section.title}>
              <span className="control-label">{section.title}</span>
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
                <span className="customize-field-label">Bar width — {customizations.barWidth}%</span>
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
                <span className="customize-field-label">Bar gap — {customizations.barGap}px</span>
                <Slider
                  size="small"
                  min={0}
                  max={24}
                  step={1}
                  value={customizations.barGap}
                  onChange={(_, value) => patch({ barGap: value as number })}
                />
              </div>
              <div className="customize-field">
                <span className="customize-field-label">Bar height — {customizations.barHeight}px</span>
                <Slider
                  size="small"
                  min={12}
                  max={36}
                  step={1}
                  value={customizations.barHeight}
                  onChange={(_, value) => patch({ barHeight: value as number })}
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

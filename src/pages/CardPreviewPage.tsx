import { CSSProperties, useMemo, useState } from "react";
import OlympiadCard from "../components/OlympiadCard";
import { emptyTrackedGame, GameResult, TrackedGame } from "../types";
import {
  BAR_SHAPES,
  BarShape,
  CARD_FRAMES,
  CardFrame,
  cardStyleClass,
  cardThemeVars,
  THEME_PRESETS,
} from "../lib/cardTheme";
import olympiadBg from "../assets/olympiad-bg.png";
import "./CardPreviewPage.css";

/**
 * /cards/preview — the board card in every palette, frame and bar shape, on
 * the backgrounds it has to survive on air. Static boards, no network.
 */

function sample(
  white: string,
  black: string,
  evaluation: number | null,
  options: Partial<TrackedGame> & { result?: GameResult } = {}
): TrackedGame {
  return {
    ...emptyTrackedGame(white, black),
    evaluation,
    depth: 20,
    moveNumber: 24,
    whiteClock: 3125,
    blackClock: 2871,
    turn: "white",
    ...options,
  };
}

const SAMPLES: Array<{ label: string; game?: TrackedGame }> = [
  { label: "Equal", game: sample("Carlsen, Magnus", "Nakamura, Hikaru", 0.2) },
  { label: "White better", game: sample("Gukesh D", "Caruana, Fabiano", 2.3, { moveNumber: 31 }) },
  {
    label: "Black winning",
    game: sample("Firouzja, Alireza", "Praggnanandhaa R", -5.8, { moveNumber: 42, turn: "black" }),
  },
  { label: "Mate", game: sample("Nepomniachtchi, Ian", "Abdusattorov, Nodirbek", null, { mateIn: 3 }) },
  {
    label: "Low clock",
    game: sample("Erigaisi Arjun", "So, Wesley", -0.7, { whiteClock: 21, moveNumber: 38 }),
  },
  { label: "Blunder alert", game: sample("Ding, Liren", "Giri, Anish", 3.1, { alert: true }) },
  { label: "Finished", game: sample("Vachier-Lagrave, Maxime", "Aronian, Levon", null, { result: "1/2-1/2" }) },
  {
    label: "Not started",
    game: sample("Keymer, Vincent", "Wei, Yi", null, { moveNumber: 0, whiteClock: 0, blackClock: 0, turn: "" }),
  },
];

/** The four states that show a palette's range, for the gallery rows. */
const GALLERY_SAMPLES = [SAMPLES[0], SAMPLES[2], SAMPLES[4], SAMPLES[6]];

const BACKGROUNDS: Array<{ name: string; className: string; style?: CSSProperties }> = [
  { name: "Chroma green", className: "bg-chroma" },
  { name: "Black", className: "bg-black" },
  { name: "White", className: "bg-white" },
  { name: "Mid grey", className: "bg-grey" },
  { name: "Olympiad backdrop", className: "bg-photo", style: { backgroundImage: `url(${olympiadBg})` } },
];

const FRAME_LABELS: Record<CardFrame, string> = {
  outline: "Outline",
  solid: "Solid",
  filled: "Filled notch",
  glass: "Glass (OBS alpha only)",
};

const BAR_LABELS: Record<BarShape, string> = {
  pill: "Rounded bar",
  square: "Square bar",
  slim: "Slim bar",
};

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
  names,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  names: (option: T) => string;
}) {
  return (
    <div className="card-preview-toggle">
      <span className="card-preview-toggle-label">{label}</span>
      <div className="preset-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? "action-btn primary" : "action-btn"}
            onClick={() => onChange(option)}
          >
            {names(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CardPreviewPage() {
  const [presetName, setPresetName] = useState(THEME_PRESETS[0].name);
  const [frame, setFrame] = useState<CardFrame>("filled");
  const [bar, setBar] = useState<BarShape>("pill");
  const [backgroundName, setBackgroundName] = useState(BACKGROUNDS[0].name);

  const preset = THEME_PRESETS.find((candidate) => candidate.name === presetName) ?? THEME_PRESETS[0];
  const background = BACKGROUNDS.find((candidate) => candidate.name === backgroundName) ?? BACKGROUNDS[0];
  const styleClass = cardStyleClass(frame, bar);
  const presetVars = useMemo(
    () => Object.fromEntries(THEME_PRESETS.map((p) => [p.name, cardThemeVars(p.colors)])),
    []
  );
  const vars = presetVars[preset.name];

  return (
    <div className="card-preview">
      <header className="card-preview-head">
        <h1>Board card preview</h1>
        <Toggle
          label="Background"
          options={BACKGROUNDS.map((b) => b.name)}
          value={backgroundName}
          onChange={setBackgroundName}
          names={(name) => name}
        />
        <Toggle label="Frame" options={CARD_FRAMES} value={frame} onChange={setFrame} names={(f) => FRAME_LABELS[f]} />
        <Toggle label="Bar" options={BAR_SHAPES} value={bar} onChange={setBar} names={(b) => BAR_LABELS[b]} />
      </header>

      <h2 className="card-preview-title">Palettes</h2>
      <section className={`card-preview-band ${background.className}`} style={background.style}>
        {THEME_PRESETS.map((candidate) => (
          <div key={candidate.name} className="card-preview-palette">
            <button
              type="button"
              className={
                candidate.name === presetName ? "card-preview-palette-name is-active" : "card-preview-palette-name"
              }
              onClick={() => setPresetName(candidate.name)}
            >
              {candidate.name}
              {candidate.note && <small>{candidate.note}</small>}
            </button>
            <div className="card-preview-row">
              {GALLERY_SAMPLES.map(({ label, game }) => (
                <OlympiadCard
                  key={label}
                  game={game}
                  board={1}
                  className={styleClass}
                  style={presetVars[candidate.name]}
                  freezeClocks
                  showAlert
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <h2 className="card-preview-title">Frames and bars · {preset.name}</h2>
      <section className={`card-preview-band ${background.className}`} style={background.style}>
        <div className="card-preview-matrix">
          {CARD_FRAMES.map((candidateFrame) =>
            BAR_SHAPES.map((candidateBar) => (
              <figure key={`${candidateFrame}-${candidateBar}`} className="card-preview-item">
                <OlympiadCard
                  game={SAMPLES[1].game}
                  board={1}
                  className={cardStyleClass(candidateFrame, candidateBar)}
                  style={vars}
                  freezeClocks
                />
                <figcaption>
                  {FRAME_LABELS[candidateFrame]} · {BAR_LABELS[candidateBar]}
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </section>

      <h2 className="card-preview-title">Every state · {preset.name} on each background</h2>
      {BACKGROUNDS.map((band) => (
        <section key={band.name} className={`card-preview-band ${band.className}`} style={band.style}>
          <span className="card-preview-band-label">{band.name}</span>
          <div className="card-preview-row">
            {SAMPLES.map(({ label, game }) => (
              <figure key={label} className="card-preview-item">
                <OlympiadCard game={game} board={1} className={styleClass} style={vars} freezeClocks showAlert />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

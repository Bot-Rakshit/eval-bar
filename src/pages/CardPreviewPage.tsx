import { CSSProperties, useMemo, useState } from "react";
import OlympiadCard from "../components/OlympiadCard";
import { emptyTrackedGame, GameResult, TrackedGame } from "../types";
import { cardThemeVars, THEME_PRESETS } from "../lib/cardTheme";
import olympiadBg from "../assets/olympiad-bg.png";
import "./CardPreviewPage.css";

/**
 * /cards/preview — every state of the board card, in each palette, on the
 * backgrounds it has to survive on air. Static boards, no network.
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
  { label: "Not started", game: sample("Keymer, Vincent", "Wei, Yi", null, { moveNumber: 0, whiteClock: 0, blackClock: 0, turn: "" }) },
];

const BACKGROUNDS: Array<{ name: string; className: string; style?: CSSProperties }> = [
  { name: "Chroma green", className: "bg-chroma" },
  { name: "Black", className: "bg-black" },
  { name: "White", className: "bg-white" },
  { name: "Mid grey", className: "bg-grey" },
  { name: "Olympiad backdrop", className: "bg-photo", style: { backgroundImage: `url(${olympiadBg})` } },
];

export default function CardPreviewPage() {
  const [presetName, setPresetName] = useState(THEME_PRESETS[0].name);
  const preset = THEME_PRESETS.find((candidate) => candidate.name === presetName) ?? THEME_PRESETS[0];
  const vars = useMemo(() => cardThemeVars(preset.colors), [preset]);

  return (
    <div className="card-preview">
      <header className="card-preview-head">
        <h1>Board card preview</h1>
        <div className="preset-row">
          {THEME_PRESETS.map((candidate) => (
            <button
              key={candidate.name}
              type="button"
              className={candidate.name === presetName ? "action-btn primary" : "action-btn"}
              onClick={() => setPresetName(candidate.name)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      </header>

      {BACKGROUNDS.map((background) => (
        <section key={background.name} className={`card-preview-band ${background.className}`} style={background.style}>
          <span className="card-preview-band-label">{background.name}</span>
          <div className="card-preview-row">
            {SAMPLES.map(({ label, game }) => (
              <figure key={label} className="card-preview-item">
                <OlympiadCard game={game} board={1} style={vars} freezeClocks showAlert />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

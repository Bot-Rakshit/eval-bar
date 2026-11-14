import { useState } from "react";
import { BarCustomizations, OverlayBackground } from "../types";

interface ObsSetupProps {
  /** Path of the broadcast view, or null until there is something to show. */
  broadcastPath: string | null;
  customizations: BarCustomizations;
  onChange: (next: BarCustomizations) => void;
  /** Shown under the link: what the overlay will follow. */
  followHint: string;
}

const BACKGROUND_OPTIONS: Array<{ value: OverlayBackground; label: string; text: string }> = [
  {
    value: "chroma",
    label: "Green screen",
    text: "The page is green behind the cards; a Chroma Key filter in OBS removes it. Works everywhere.",
  },
  {
    value: "transparent",
    label: "Transparent",
    text: "Nothing behind the cards, so there is nothing to key. Needs an OBS Browser source (not a window capture).",
  },
];

/**
 * The last step of the control page: everything needed to get the overlay
 * into OBS, in order. The link carries the look, so it is shown live and the
 * operator is reminded to re-copy it after changing anything.
 */
export function ObsSetup({ broadcastPath, customizations, onChange, followHint }: ObsSetupProps) {
  const [copied, setCopied] = useState(false);
  const url = broadcastPath ? `${window.location.origin}${broadcastPath}` : "";
  const background = customizations.overlayBackground;

  const copy = () => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => alert("Could not copy — select the link and copy it by hand."));
  };

  return (
    <div className="obs-panel">
      <span className="control-label">Put it on OBS</span>
      <ol className="obs-steps">
        <li className="obs-step">
          <div className="obs-step-body">
            <span className="obs-step-title">Pick the background</span>
            <div className="preset-row">
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={background === option.value ? "action-btn primary" : "action-btn"}
                  onClick={() => onChange({ ...customizations, overlayBackground: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="obs-step-text">
              {BACKGROUND_OPTIONS.find((option) => option.value === background)?.text}
            </p>
            {customizations.cardFrame === "glass" && background === "chroma" && (
              <p className="obs-warning">
                The Glass frame lets the green through and it keys out with it — use Transparent, or another
                frame.
              </p>
            )}
          </div>
        </li>

        <li className="obs-step">
          <div className="obs-step-body">
            <span className="obs-step-title">Copy the overlay link</span>
            <div className="obs-link-row">
              <input
                className="obs-link-input"
                readOnly
                value={url || "Pick the games to show first"}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Overlay link"
              />
              <button type="button" className="action-btn primary" onClick={copy} disabled={!url}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button
                type="button"
                className="action-btn"
                disabled={!url}
                onClick={() => window.open(url, "_blank", "noopener")}
              >
                Preview
              </button>
            </div>
            <p className="obs-step-text">
              {followHint} The link carries the look — after changing the theme, frame or games, copy it again
              and paste it into the source.
            </p>
          </div>
        </li>

        <li className="obs-step">
          <div className="obs-step-body">
            <span className="obs-step-title">Add a Browser source</span>
            <p className="obs-step-text">
              In OBS: <code>Sources</code> → <code>+</code> → <code>Browser</code>. Paste the link into{" "}
              <code>URL</code> and set <code>Width 1920</code>, <code>Height 1080</code>. To trim the empty part,
              hold <code>Alt</code> (<code>Option</code> on Mac) and drag the source's edges.
            </p>
          </div>
        </li>

        <li className="obs-step">
          <div className="obs-step-body">
            <span className="obs-step-title">
              {background === "chroma" ? "Key out the green" : "Nothing to key"}
            </span>
            <p className="obs-step-text">
              {background === "chroma" ? (
                <>
                  Right-click the source → <code>Filters</code> → <code>+</code> → <code>Chroma Key</code>, with{" "}
                  <code>Key Color Type: Green</code>.
                </>
              ) : (
                <>
                  OBS draws the page with its transparency, so the cards sit straight on your scene. If you see a
                  background, check the source's <code>Custom CSS</code> has not been changed from the default.
                </>
              )}
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}

export default ObsSetup;

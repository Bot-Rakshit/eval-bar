import { useState } from "react";
import { TrackedGame } from "../types";
import { teamCode } from "../lib/feds";
import { matchEvalShare, matchScore, opponentOf } from "../lib/teamScore";
import "./Scorecard.css";

/**
 * A match at a glance: the two federations, the points already on the board,
 * and a bar for how the boards stand on the engine right now. The bar carries
 * no number on purpose — on air, a second score next to the real one reads as
 * a contradiction.
 */

interface ScorecardProps {
  games: TrackedGame[];
  team: string;
  /** Hide the eval bar; just the score. */
  showProjection?: boolean;
  /** Hide the flags. */
  showFlags?: boolean;
  /** Section name for the tab on the top edge, e.g. "Open" or "Women". */
  section?: string;
}

/** Flags are bundled under /flags, keyed by federation code. */
function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  // Extra teams share a federation's flag: "UZB 2" → UZB.png
  const file = code.split(" ")[0];
  if (!file || failed) return <span className="score-flag" />;
  return (
    <span className="score-flag">
      <img src={`/flags/${file}.png`} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

/**
 * A score with its half point a size down ("2" + small "½"), the scoreboard
 * way — it keeps "2½–1½" compact. A lone half stays full size.
 */
function Points({ value }: { value: number }) {
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  if (whole === 0 && half) return <>½</>;
  return (
    <>
      {whole}
      {half && <span className="score-half">½</span>}
    </>
  );
}

/** One side of the match, top to bottom: flag, federation code, its score. */
function Side({
  code,
  points,
  isTeam,
  showFlag,
}: {
  code: string;
  points: number;
  isTeam: boolean;
  showFlag: boolean;
}) {
  return (
    <div className={isTeam ? "score-side is-team" : "score-side"}>
      {showFlag && <Flag code={code} />}
      <span className="score-code">{code || "—"}</span>
      <span className="score-points">
        <Points value={points} />
      </span>
    </div>
  );
}

/**
 * The followed team on the left, the opponent on the right — the same sides as
 * the board cards and the bar beneath, so the eye never has to swap.
 */
export function Scorecard({
  games,
  team,
  showProjection = true,
  showFlags = true,
  section,
}: ScorecardProps) {
  const score = matchScore(games, team);
  const opponent = opponentOf(games, team);
  const share = matchEvalShare(games, team);

  return (
    <div className="score-card">
      {section && <span className="score-tab">{section}</span>}
      <div className="score-match">
        <Side code={teamCode(team)} points={score.us} isTeam showFlag={showFlags} />
        <span className="score-dash">–</span>
        <Side code={opponent ? teamCode(opponent) : ""} points={score.them} isTeam={false} showFlag={showFlags} />
      </div>

      {showProjection && (
        <div className="score-bar" aria-label="Match eval">
          <div className="score-bar-us" style={{ transform: `scaleX(${share})` }} />
          <div className="score-bar-half" />
        </div>
      )}
    </div>
  );
}

export default Scorecard;

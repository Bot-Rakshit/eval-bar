import React, { useState } from "react";
import { TrackedGame } from "../types";
import { teamCode } from "../lib/feds";
import { formatPoints, matchScore, opponentOf } from "../lib/teamScore";
import { projectedRaw } from "../lib/intel/moments";
import "./Scorecard.css";

/**
 * A match at a glance: the two federations, the points already on the board,
 * and a bar for where the match is heading — the projected split printed in
 * its two ends.
 */

interface ScorecardProps {
  games: TrackedGame[];
  team: string;
  /** Hide the projection bar; just the score. */
  showProjection?: boolean;
  /** Hide the flags. */
  showFlags?: boolean;
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

function TeamRow({
  code,
  points,
  isTeam,
  showFlag,
}: {
  code: string;
  points: string;
  isTeam: boolean;
  showFlag: boolean;
}) {
  return (
    <div className={isTeam ? "score-row is-team" : "score-row"}>
      {showFlag && <Flag code={code} />}
      <span className="score-code">{code || "—"}</span>
      <span className="score-points">{points}</span>
    </div>
  );
}

const roundHalf = (value: number) => Math.round(value * 2) / 2;

export function Scorecard({ games, team, showProjection = true, showFlags = true }: ScorecardProps) {
  const score = matchScore(games, team);
  const opponent = opponentOf(games, team);
  const projection = projectedRaw(games, team);

  const total = projection.us + projection.them;
  // No pairing yet means nothing to weigh, so the bar sits level and blank.
  const paired = games.length > 0 && total > 0;
  const share = paired ? projection.us / total : 0.5;
  const pct = `${(share * 100).toFixed(2)}%`;

  const split = paired && (
    <>
      <span>{formatPoints(roundHalf(projection.us))}</span>
      <span>{formatPoints(roundHalf(projection.them))}</span>
    </>
  );

  return (
    <div className="score-card">
      <TeamRow code={teamCode(team)} points={formatPoints(score.us)} isTeam showFlag={showFlags} />
      <TeamRow
        code={opponent ? teamCode(opponent) : ""}
        points={formatPoints(score.them)}
        isTeam={false}
        showFlag={showFlags}
      />

      {showProjection && (
        <div className="score-bar" aria-label="Projected match score">
          <div className="score-bar-us" style={{ transform: `scaleX(${share})` }} />
          <div className="score-bar-half" />
          <div
            className="score-bar-text on-us"
            style={{ clipPath: `inset(0 calc(100% - ${pct}) 0 0)` } as React.CSSProperties}
          >
            {split}
          </div>
          <div className="score-bar-text on-them" style={{ clipPath: `inset(0 0 0 ${pct})` }}>
            {split}
          </div>
        </div>
      )}
    </div>
  );
}

export default Scorecard;

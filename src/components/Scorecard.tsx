import { useState } from "react";
import { TrackedGame } from "../types";
import { teamCode } from "../lib/feds";
import { formatPoints, matchScore, opponentOf } from "../lib/teamScore";
import { projectedRaw } from "../lib/intel/moments";
import "./Scorecard.css";

/**
 * A match at a glance: the two federations, the points already on the board,
 * and a bar for where the round is heading if the live games land the way the
 * engine currently sees them.
 */

interface ScorecardProps {
  games: TrackedGame[];
  team: string;
  /** Hide the projection bar and caption; just the score. */
  showProjection?: boolean;
  /** Hide the flags, for a federation we have no flag for. */
  showFlags?: boolean;
  /** Section and round, e.g. "Open · Round 6". Omitted when unknown. */
  label?: string | null;
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

export function Scorecard({
  games,
  team,
  showProjection = true,
  showFlags = true,
  label = null,
}: ScorecardProps) {
  const score = matchScore(games, team);
  const opponent = opponentOf(games, team);
  const projection = projectedRaw(games, team);

  const decided = games.filter((game) => game.result).length;
  const complete = games.length > 0 && decided === games.length;
  const projecting = projection.live > 0;

  const total = projection.us + projection.them;
  // Before any game is on the board there is nothing to weigh, so sit level.
  const usShare = total > 0 && (projecting || complete) ? projection.us / total : 0.5;

  // With nothing running and nothing decided, every board is still notionally
  // a draw — printing that as a projection would read as a real 2-2, so the
  // number is held back until there is something behind it.
  const caption = projecting ? "Projected" : complete ? "Final" : games.length > 0 ? "Not started" : "No pairing";
  const roundHalf = (value: number) => Math.round(value * 2) / 2;

  return (
    <div className="score-card">
      {label && <div className="score-label">{label}</div>}

      <div className="score-teams">
        <TeamRow
          code={teamCode(team)}
          points={formatPoints(score.us)}
          isTeam
          showFlag={showFlags}
        />
        <TeamRow
          code={opponent ? teamCode(opponent) : ""}
          points={formatPoints(score.them)}
          isTeam={false}
          showFlag={showFlags}
        />
      </div>

      {showProjection && (
        <div className="score-projection">
          <div className="score-bar">
            <div className="score-bar-us" style={{ transform: `scaleX(${usShare})` }} />
            <div className="score-bar-half" />
          </div>
          <div className="score-caption">
            <span>{caption}</span>
            {(projecting || complete) && (
              <span className="score-caption-value">
                {formatPoints(roundHalf(projection.us))}–{formatPoints(roundHalf(projection.them))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Scorecard;

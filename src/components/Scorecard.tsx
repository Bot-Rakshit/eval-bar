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
}

export function Scorecard({ games, team, showProjection = true }: ScorecardProps) {
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
      <div className="score-head">
        <span className="score-code is-team">{teamCode(team) || "—"}</span>
        <span className="score-value">
          {formatPoints(score.us)}
          <span className="score-dash">–</span>
          {formatPoints(score.them)}
        </span>
        <span className="score-code is-them">{opponent ? teamCode(opponent) : "—"}</span>
      </div>

      {showProjection && (
        <>
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
        </>
      )}
    </div>
  );
}

export default Scorecard;

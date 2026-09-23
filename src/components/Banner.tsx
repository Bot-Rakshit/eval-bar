import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TrackedGame } from "../types";
import { ActiveMoment } from "../hooks/useMoments";
import { Standings, StandingRow } from "../api/standings";
import { teamCode } from "../lib/feds";
import { formatPoints } from "../lib/teamScore";
import "./Banner.css";

const LEAVE_MS = 320;

function Flag({ team, className }: { team: string; className: string }) {
  const [failed, setFailed] = useState(false);
  const file = teamCode(team).split(" ")[0];
  if (!file || failed) return <span className={className} />;
  return (
    <span className={className}>
      <img src={`/flags/${file}.png`} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

function formatEval(game: TrackedGame): string | null {
  if (game.mateIn !== null) return `M${Math.abs(game.mateIn)}`;
  if (game.evaluation === null) return null;
  const value = game.evaluation;
  if (Math.abs(value) >= 10) return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

const RESULT_TEXT: Record<string, string> = { "1-0": "1–0", "0-1": "0–1", "1/2-1/2": "½–½" };

/**
 * The one hard fact in the corner: the result for a finished game, the clock
 * for time trouble, the eval for anything the engine called.
 */
function factFor(active: ActiveMoment): string | null {
  const { game, moment } = active;
  if (game.result) return RESULT_TEXT[game.result] ?? null;
  const label = moment.label.toLowerCase();
  if (label.includes("minute") || label.includes("time")) {
    return formatClock(moment.side === "white" ? game.whiteClock : game.blackClock);
  }
  return formatEval(game);
}

/**
 * A moment on air: what happened in the tag, who it happened to in the middle,
 * the board and the one hard fact at the right. Sized to the board strip and
 * laid over it.
 */
export function MomentBanner({ active, board }: { active: ActiveMoment; board: number }) {
  const { moment, game } = active;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setLeaving(false);
    const timer = setTimeout(() => setLeaving(true), Math.max(0, moment.durationMs - LEAVE_MS));
    return () => clearTimeout(timer);
  }, [moment.id, moment.durationMs]);

  const team = moment.side === "white" ? game.whiteTeam : game.blackTeam;
  const fact = factFor(active);

  return (
    <div
      key={moment.id}
      className={`banner tone-${moment.tone}${leaving ? " is-leaving" : ""}`}
      style={{ "--banner-ms": `${moment.durationMs}ms` } as React.CSSProperties}
    >
      <div className="banner-tag">
        <span className="banner-label">{moment.label}</span>
      </div>
      <div className="banner-main">
        {team && <Flag team={team} className="banner-flag" />}
        <span className={moment.subject.length > 12 ? "banner-name is-long" : "banner-name"}>
          {moment.subject}
        </span>
      </div>
      <div className="banner-meta">
        {board > 0 && <span className="banner-board">Board {board}</span>}
        {fact && <span className="banner-fact">{fact}</span>}
      </div>
      <div className="banner-timer" />
    </div>
  );
}

/** "=7" when the place is shared, so a run of equal numbers reads as a tie. */
function rankLabel(row: StandingRow, rows: StandingRow[]): string {
  const shared = rows.filter((other) => other.rank === row.rank).length > 1;
  return shared ? `=${row.rank}` : `${row.rank}`;
}

function StandingEntry({ row, rows, isTeam }: { row: StandingRow; rows: StandingRow[]; isTeam: boolean }) {
  return (
    <span className={isTeam ? "standing is-team" : "standing"}>
      <span className="standing-rank">{rankLabel(row, rows)}</span>
      <Flag team={row.name} className="standing-flag" />
      <span className="standing-code">{teamCode(row.name)}</span>
      <span className="standing-mp">{row.mp}</span>
      <span className="standing-gp">{formatPoints(row.gp)}</span>
    </span>
  );
}

/**
 * Crawl speed in the strip's own units — about 150px/s on screen at the
 * default scale, standard ticker pace. A full table (top 10 with a tie at the
 * cut) takes ~30s to pass.
 */
const CRAWL_PX_PER_S = 95;
const HOLD_START_MS = 2400;
const HOLD_END_MS = 2600;

/**
 * The table as a ticker: the leaders scroll past once, the followed team lit
 * wherever it sits (and appended after a gap when it is outside the top), then
 * the banner leaves and hands the strip back to the boards.
 */
export function StandingsBanner({
  standings,
  team,
  section,
  onDone,
}: {
  standings: Standings;
  team: string;
  section: string;
  onDone: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    // Only as far as the last entry needs to come into view — no dead air.
    const distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    const crawlMs = (distance / CRAWL_PX_PER_S) * 1000;
    const animation =
      distance > 0
        ? track.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-distance}px)` }], {
            duration: crawlMs,
            delay: HOLD_START_MS,
            easing: "linear",
            fill: "forwards",
          })
        : null;

    const total = HOLD_START_MS + crawlMs + HOLD_END_MS;
    const leaveTimer = setTimeout(() => setLeaving(true), total);
    const doneTimer = setTimeout(() => doneRef.current(), total + LEAVE_MS);
    return () => {
      animation?.cancel();
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [standings]);

  const isTeam = (row: StandingRow) => row.name.trim().toLowerCase() === team.trim().toLowerCase();
  const rows = standings.top;

  return (
    <div className={`banner tone-good${leaving ? " is-leaving" : ""}`}>
      <div className="banner-tag">
        <span className="banner-kicker">
          {section} · after round {standings.rounds}
        </span>
        <span className="banner-label">Standings</span>
      </div>
      <div className="banner-crawl" ref={viewportRef}>
        <div className="banner-track" ref={trackRef}>
          {rows.map((row) => (
            <StandingEntry key={row.name} row={row} rows={rows} isTeam={isTeam(row)} />
          ))}
          {standings.team && (
            <>
              <span className="standing-gap">···</span>
              <StandingEntry row={standings.team} rows={[standings.team]} isTeam />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

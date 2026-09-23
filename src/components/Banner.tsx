import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TrackedGame } from "../types";
import { ActiveMoment } from "../hooks/useMoments";
import { Standings, StandingRow } from "../api/standings";
import { teamCode } from "../lib/feds";
import "./Banner.css";

const LEAVE_MS = 320;

function Flag({ team, className, fed }: { team: string; className: string; fed?: string }) {
  const [failed, setFailed] = useState(false);
  const file = fed || teamCode(team).split(" ")[0];
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

/**
 * The team's short code. chess-results gives the federation, which is the
 * right answer — except that a host's extra teams share it, so "Uzbekistan 2"
 * keeps its number ("UZB 2"). Without a federation (the Lichess fallback) the
 * code comes from the name.
 */
function codeOf(row: StandingRow): string {
  if (!row.fed) return teamCode(row.name);
  const extra = row.name.match(/\s(\d+)$/);
  return extra ? `${row.fed} ${extra[1]}` : row.fed;
}

/** 1 → "st", 2 → "nd", 11 → "th", 22 → "nd" */
function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  return ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
}

/**
 * One team in the table: its place as an ordinal ("=7th" when shared), large,
 * then flag, code and match points in brackets — "(12 MP)" — so there is
 * exactly one other number and it says what it is.
 */
function StandingEntry({ row, shared, isTeam }: { row: StandingRow; shared: boolean; isTeam: boolean }) {
  return (
    <span className={isTeam ? "standing is-team" : "standing"}>
      <span className="standing-rank">
        {shared && "="}
        {row.rank}
        <small>{ordinalSuffix(row.rank)}</small>
      </span>
      <Flag team={row.name} fed={row.fed} className="standing-flag" />
      <span className="standing-code">{codeOf(row)}</span>
      <span className="standing-mp">
        <span className="standing-paren">(</span>
        {row.mp}
        <small>MP</small>
        <span className="standing-paren">)</span>
      </span>
    </span>
  );
}

/**
 * Crawl speed in the strip's own units — about 150px/s on screen at the
 * default scale, standard ticker pace.
 */
const CRAWL_PX_PER_S = 95;
/** Full passes through the table on each showing. */
const PASSES = 2;
const HOLD_START_MS = 2400;
const HOLD_END_MS = 1800;

/**
 * The table as a ticker. The list is laid out three times end to end and
 * scrolled exactly two copies' length, so it loops seamlessly through the
 * table twice and comes to rest with the leaders back at the start. The
 * followed team is lit wherever it sits; when it is far down it and the two
 * places below it follow the leaders after a gap.
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const track = trackRef.current;
    const copies = track?.children;
    if (!track || !copies || copies.length < 2) return;

    // One copy's length, gap included: where the second copy starts
    const cycle = (copies[1] as HTMLElement).offsetLeft - (copies[0] as HTMLElement).offsetLeft;
    const crawlMs = ((cycle * PASSES) / CRAWL_PX_PER_S) * 1000;
    const animation = track.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${-cycle * PASSES}px)` }],
      { duration: crawlMs, delay: HOLD_START_MS, easing: "linear", fill: "forwards" }
    );

    const total = HOLD_START_MS + crawlMs + HOLD_END_MS;
    const leaveTimer = setTimeout(() => setLeaving(true), total);
    const doneTimer = setTimeout(() => doneRef.current(), total + LEAVE_MS);
    return () => {
      animation.cancel();
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [standings]);

  const isTeam = (row: StandingRow) => row.name.trim().toLowerCase() === team.trim().toLowerCase();
  const every = [...standings.top, ...standings.tail];
  const shared = (row: StandingRow) => every.filter((other) => other.rank === row.rank).length > 1;
  const entry = (row: StandingRow) => (
    <StandingEntry key={row.name} row={row} shared={shared(row)} isTeam={isTeam(row)} />
  );

  return (
    <div className={`banner tone-good${leaving ? " is-leaving" : ""}`}>
      <div className="banner-tag">
        <span className="banner-kicker">
          {section} · after round {standings.rounds}
        </span>
        <span className="banner-label">Standings</span>
      </div>
      <div className="banner-crawl">
        <div className="banner-track" ref={trackRef}>
          {[0, 1, 2].map((copy) => (
            <div className="banner-cycle" key={copy} aria-hidden={copy > 0}>
              {standings.top.map(entry)}
              {standings.tail.length > 0 && (
                <>
                  <span className="standing-gap">···</span>
                  {standings.tail.map(entry)}
                </>
              )}
              <span className="banner-loop" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

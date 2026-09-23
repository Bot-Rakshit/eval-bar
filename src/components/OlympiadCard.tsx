import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TrackedGame } from "../types";
import { formatPlayerName } from "../lib/playerName";
import "./OlympiadCard.css";

/**
 * A board card for the Olympiad overlay.
 *
 * The move number sits in a notch cut down into the card's top edge — inside
 * the card's box, never poking out of it — filled in its own colour and left
 * closed across the top by a quieter line than the card stroke.
 *
 * The outline is a single path: the top edge runs into the notch's shoulders
 * and out the other side, so the stroke is continuous the whole way round. The
 * shoulders are after Chessiro's streak ribbon — they leave the edge
 * horizontally and land flat on the notch floor, so there is no corner
 * anywhere along the join.
 */

/**
 * Authored size, matching the footprint of the card this replaces (its 232px
 * plus the padding and border that sat outside it). The strip is zoomed as a
 * whole, so these are design units.
 */
export const CARD_W = 246;
export const CARD_H = 92;
export const CARD_GAP = 8;

const STROKE = 1;
/** Corner radius of the card. */
const RADIUS = 12;
/** How far the notch cuts down from the top edge. */
const NOTCH_DEPTH = 20;
/** Flat width along the bottom of the notch. */
const NOTCH_W = 18;
/** Horizontal run of each shoulder curve. */
const SHOULDER_W = 28;

/**
 * Each shoulder is one cubic with horizontal tangents at both ends, after
 * Chessiro's streak ribbon. These are the handle lengths, as a fraction of the
 * shoulder's run: the longer the handle, the further the curve holds its
 * direction before turning, so the bend reads as a wider radius.
 *
 * The top handle is the longer of the two, so the notch flares wide where it
 * leaves the edge and closes in more tightly onto the floor.
 *
 * Keep them together at or under 1: past that the handles cross over each
 * other and the curve kinks back on itself. Matched at 0.5 each they are
 * exactly on that limit, so this is as round as a symmetric pair gets for a
 * given shoulder run — to open it up further, widen SHOULDER_W or make
 * NOTCH_DEPTH shallower rather than raising these.
 */
const EASE_TOP = 0.65;
const EASE_FLOOR = 0.35;

const INSET = STROKE / 2;
const TOP = INSET;
const FLOOR = TOP + NOTCH_DEPTH;
const CX = CARD_W / 2;
const SHOULDER_START = CX - NOTCH_W / 2 - SHOULDER_W;
const NOTCH_LEFT = CX - NOTCH_W / 2;
const NOTCH_RIGHT = CX + NOTCH_W / 2;
const SHOULDER_END = CX + NOTCH_W / 2 + SHOULDER_W;

/**
 * Where the tops of the player names sit, down from the card's top edge. The
 * notch has narrowed a long way by the time it reaches them.
 */
const NAME_BAND_Y = 10;
/** Air either side, between a name and the notch's edge. */
const NAME_CLEARANCE = 5;

/** A point on the left shoulder. y follows a smoothstep between the two ends. */
function shoulderPoint(t: number): { x: number; y: number } {
  const s = SHOULDER_W;
  const a = SHOULDER_START;
  const c1 = a + EASE_TOP * s;
  const c2 = a + (1 - EASE_FLOOR) * s;
  const u = 1 - t;
  return {
    x: u * u * u * a + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * NOTCH_LEFT,
    y: TOP + (FLOOR - TOP) * (3 * t * t - 2 * t * t * t),
  };
}

/** How far the notch reaches out from the centre at a given depth. */
function notchHalfWidthAt(depth: number): number {
  let previous = shoulderPoint(0);
  for (let step = 1; step <= 100; step += 1) {
    const point = shoulderPoint(step / 100);
    if (point.y >= depth) {
      const run = point.y - previous.y;
      const between = run === 0 ? 0 : (depth - previous.y) / run;
      return CX - (previous.x + (point.x - previous.x) * between);
    }
    previous = point;
  }
  return CX - NOTCH_LEFT;
}

/**
 * How much room the names give up to the notch.
 *
 * Measured where the names actually are rather than at the card's top edge:
 * holding open the notch's full width up there costs each name about 20px it
 * never needed. Raise NAME_CLEARANCE if they end up too close.
 */
export const NAME_GUTTER = Math.round(2 * (notchHalfWidthAt(NAME_BAND_Y) + NAME_CLEARANCE));

/**
 * The dip, left to right, starting from the top edge at SHOULDER_START: down
 * leaving the edge horizontally, flat along the notch floor, then back up to
 * meet the edge horizontally again at SHOULDER_END.
 */
const DIP_SEGMENTS = (() => {
  const s = SHOULDER_W;
  const a = SHOULDER_START;
  const c = NOTCH_RIGHT;
  return [
    `C ${a + EASE_TOP * s} ${TOP} ${a + (1 - EASE_FLOOR) * s} ${FLOOR} ${NOTCH_LEFT} ${FLOOR}`,
    `L ${NOTCH_RIGHT} ${FLOOR}`,
    // The same curve mirrored.
    `C ${c + EASE_FLOOR * s} ${FLOOR} ${c + (1 - EASE_TOP) * s} ${TOP} ${SHOULDER_END} ${TOP}`,
  ].join(" ");
})();

/**
 * The card outline. The top edge runs into the dip and out the other side, so
 * this is a single closed path, so the stroke is continuous all the way round.
 * The gap it leaves across the top of the notch is closed separately, by
 * NOTCH_TOP_PATH.
 */
const CARD_PATH = (() => {
  const left = INSET;
  const right = CARD_W - INSET;
  const bottom = CARD_H - INSET;
  return [
    `M ${left + RADIUS} ${TOP}`,
    `L ${SHOULDER_START} ${TOP}`,
    DIP_SEGMENTS,
    `L ${right - RADIUS} ${TOP}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${right} ${TOP + RADIUS}`,
    `L ${right} ${bottom - RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${right - RADIUS} ${bottom}`,
    `L ${left + RADIUS} ${bottom}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${left} ${bottom - RADIUS}`,
    `L ${left} ${TOP + RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${left + RADIUS} ${TOP}`,
    "Z",
  ].join(" ");
})();

/**
 * The notch's own region: the dip, closed straight back along the top edge.
 */
const NOTCH_FILL_PATH = `M ${SHOULDER_START} ${TOP} ${DIP_SEGMENTS} Z`;

/**
 * The gap the notch leaves in the top edge, closed with its own line. Drawn in
 * a dialled-back version of the card stroke so the edge still reads as
 * continuous without the number looking boxed in.
 */
const NOTCH_TOP_PATH = `M ${SHOULDER_START} ${TOP} L ${SHOULDER_END} ${TOP}`;

/** Chessiro's eval curve: a logistic on pawns, so the fill never steps. */
function whitePercent(evaluation: number | null, mateIn: number | null): number {
  if (mateIn !== null) return mateIn > 0 ? 100 : 0;
  if (evaluation === null) return 50;
  return Math.min(100, Math.max(0, 100 / (1 + Math.exp(-0.4 * evaluation))));
}

/**
 * The advantage as a size, not a signed White-relative eval: it is printed in
 * the leading side's part of the bar, so "+1.6" there means that side is 1.6
 * up — whichever colour it has.
 */
function formatAdvantage(evaluation: number | null, mateIn: number | null): string {
  if (mateIn !== null) return mateIn === 0 ? "#" : `M${Math.abs(mateIn)}`;
  if (evaluation === null) return "—";
  const size = Math.abs(evaluation);
  if (size < 0.05) return "0.0";
  return size >= 10 ? `+${Math.round(size)}` : `+${size.toFixed(1)}`;
}

/** A decided game from the left side's point of view: "1–0" is a left win. */
function resultLeftRight(result: string, leftIsWhite: boolean): string {
  if (result === "1/2-1/2") return "½–½";
  const whiteWon = result === "1-0";
  return whiteWon === leftIsWhite ? "1–0" : "0–1";
}

function formatClock(seconds: number): string {
  if (seconds < 1) return "0:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Truncation with two dots.
 *
 * CSS can do this with text-overflow: "..", but only Firefox implements the
 * string form — Chromium silently falls back to the ellipsis glyph, which is
 * one wide character rather than the two dots wanted. So the cut is measured
 * here instead, against the font the element actually resolves to, which keeps
 * it honest if the size or weight changes in the CSS.
 */
const DOTS = "..";

let measurer: CanvasRenderingContext2D | null = null;

function textWidth(text: string, font: string): number {
  if (!measurer) measurer = document.createElement("canvas").getContext("2d");
  if (!measurer) return 0;
  measurer.font = font;
  return measurer.measureText(text).width;
}

/** The longest prefix of `text` that fits in `max` once the dots are added. */
function clipToWidth(text: string, font: string, max: number): string {
  if (max <= 0 || textWidth(text, font) <= max) return text;
  const dots = textWidth(DOTS, font);
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (textWidth(text.slice(0, mid), font) + dots <= max) low = mid;
    else high = mid - 1;
  }
  return low === 0 ? DOTS : text.slice(0, low).trimEnd() + DOTS;
}

/**
 * The canvas font, built from longhands rather than the font shorthand.
 * That shorthand computes to an empty string as soon as a property it cannot
 * express is set — font-variant-numeric is enough to do it — and an empty
 * string leaves the canvas on its 10px default, which silently measures
 * everything as fitting. The longhands always report.
 */
function fontOf(el: Element): string {
  const style = getComputedStyle(el);
  return [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily]
    .filter(Boolean)
    .join(" ");
}

/** Re-renders once the webfonts are in, so nothing is measured in a fallback. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => document.fonts?.status === "loaded");
  useEffect(() => {
    if (ready || !document.fonts) return;
    let live = true;
    document.fonts.ready.then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}

function PlayerName({ name, className }: { name: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(name);
  const fontsReady = useFontsReady();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth comes from the flex share rather than the content, so
    // measuring against it does not feed back into what gets rendered.
    setShown(clipToWidth(name, fontOf(el), el.clientWidth));
  }, [name, fontsReady]);

  return (
    <span ref={ref} className={className} title={name}>
      {shown}
    </span>
  );
}

/**
 * Clock glyphs in fixed-width cells. Sora is proportional, and even with
 * tabular figures the colon would still shuffle the line — this pins every
 * glyph so nothing moves as the clock counts down.
 */
function MonoTime({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className ? `oly-mono ${className}` : "oly-mono"}>
      {text.split("").map((char, index) => (
        <span key={index} className={char === ":" ? "oly-mono-sep" : "oly-mono-cell"}>
          {char}
        </span>
      ))}
    </span>
  );
}

/** Card fill, the notch in its own colour, then the quiet line and the stroke. */
function Frame() {
  return (
    <svg className="oly-frame" width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
      <path d={CARD_PATH} className="oly-card-fill" />
      <path d={NOTCH_FILL_PATH} className="oly-notch-fill" />
      <path d={NOTCH_TOP_PATH} className="oly-notch-stroke" strokeWidth={STROKE} />
      <path d={CARD_PATH} className="oly-stroke" strokeWidth={STROKE} />
    </svg>
  );
}

export interface OlympiadCardProps {
  game?: TrackedGame;
  /** Board number, used when there is no game yet. */
  board: number;
  /** Team whose player is highlighted. */
  team?: string;
  /** Design mode: render clocks exactly as given instead of ticking them. */
  freezeClocks?: boolean;
}

function isTeam(candidate: string, team: string | undefined): boolean {
  if (!team) return false;
  return candidate.trim().toLowerCase() === team.trim().toLowerCase();
}

export function OlympiadCard({ game, board, team, freezeClocks }: OlympiadCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turn = game?.turn ?? "";
  const result = game?.result ?? null;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (turn !== "" && !result && !freezeClocks) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [turn, result, freezeClocks]);

  // The names sit either side of the notch and are clipped to fit.
  const gutter = <span className="oly-notch-gutter" style={{ width: NAME_GUTTER }} />;

  if (!game) {
    return (
      <div className="oly-card is-empty" style={{ width: CARD_W, height: CARD_H }}>
        <Frame />
        <span className="oly-move" style={{ height: NOTCH_DEPTH }}>
          {board}
        </span>
        <div className="oly-body">
          <div className="oly-names">
            <span className="oly-name is-team">{team ?? ""}</span>
            {gutter}
            <span className="oly-name is-muted">Board {board}</span>
          </div>
          <div className="oly-bar">
            <div className="oly-bar-us" style={{ transform: "scaleX(0.5)" }} />
          </div>
          <div className="oly-clocks">
            <MonoTime text="1:30:00" className="is-muted" />
            <MonoTime text="1:30:00" className="is-muted" />
          </div>
        </div>
      </div>
    );
  }

  // The followed team always sits on the left, whatever colour it has on this
  // board; everything below is laid out left/right, not White/Black.
  const leftIsWhite = !(isTeam(game.blackTeam, team) && !isTeam(game.whiteTeam, team));
  const leftIsTeam = isTeam(leftIsWhite ? game.whiteTeam : game.blackTeam, team);
  const rightIsTeam = isTeam(leftIsWhite ? game.blackTeam : game.whiteTeam, team);

  const whiteShare = whitePercent(game.evaluation, game.mateIn);
  const leftShare = leftIsWhite ? whiteShare : 100 - whiteShare;
  const label = formatAdvantage(game.evaluation, game.mateIn);
  // Same threshold Chessiro uses, so the label swaps sides only once settled.
  const rightLeads = leftShare < 49.8;

  const liveWhite = turn === "white" && !result ? game.whiteClock - elapsed : game.whiteClock;
  const liveBlack = turn === "black" && !result ? game.blackClock - elapsed : game.blackClock;
  const leftClock = leftIsWhite ? liveWhite : liveBlack;
  const rightClock = leftIsWhite ? liveBlack : liveWhite;
  const clocksUnknown = game.whiteClock === 0 && game.blackClock === 0;
  const clockText = (value: number) => (clocksUnknown ? "–:––:––" : formatClock(Math.max(0, value)));

  const leftName = formatPlayerName(leftIsWhite ? game.whitePlayer : game.blackPlayer, true);
  const rightName = formatPlayerName(leftIsWhite ? game.blackPlayer : game.whitePlayer, true);

  return (
    <div className="oly-card" style={{ width: CARD_W, height: CARD_H }}>
      <Frame />
      <span className="oly-move" style={{ height: NOTCH_DEPTH }}>
        {game.moveNumber}
      </span>
      <div className="oly-body">
        <div className="oly-names">
          <PlayerName name={leftName} className={leftIsTeam ? "oly-name is-team" : "oly-name"} />
          {gutter}
          <PlayerName name={rightName} className={rightIsTeam ? "oly-name is-team" : "oly-name"} />
        </div>

        {result ? (
          <div className="oly-result">{resultLeftRight(result, leftIsWhite)}</div>
        ) : (
          <>
            <div className="oly-bar">
              <div className="oly-bar-us" style={{ transform: `scaleX(${leftShare / 100})` }} />
              <span
                className="oly-eval on-us"
                style={{ opacity: rightLeads ? 0 : 1 }}
                aria-hidden={rightLeads}
              >
                {label}
              </span>
              <span
                className="oly-eval on-them"
                style={{ opacity: rightLeads ? 1 : 0 }}
                aria-hidden={!rightLeads}
              >
                {label}
              </span>
            </div>

            <div className="oly-clocks">
              <MonoTime
                text={clockText(leftClock)}
                className={`${leftIsTeam ? "is-team" : ""} ${!clocksUnknown && leftClock <= 30 ? "is-low" : ""}`}
              />
              <MonoTime
                text={clockText(rightClock)}
                className={`${rightIsTeam ? "is-team" : ""} ${!clocksUnknown && rightClock <= 30 ? "is-low" : ""}`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OlympiadCard;

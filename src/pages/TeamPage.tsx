import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { TrackedGame } from "../types";
import OlympiadGrid from "../components/OlympiadGrid";
import { ActiveMoment, useMoments } from "../hooks/useMoments";
import { ALERT_PRIORITY, projectedScore } from "../lib/intel/moments";
import { DEFAULT_TEAM, OLYMPIAD_ANCHOR_TOUR, useOlympiadTeam } from "../hooks/useOlympiadTeam";
import { formatPoints, matchScore, opponentOf } from "../lib/teamScore";
import { DEMO_ALERT, DEMO_SCRIPT, demoGames, demoMoment } from "../lib/intel/demo";
import { MomentBanner, StandingsBanner } from "../components/Banner";
import { useStandingsTicker } from "../hooks/useStandingsTicker";

/**
 * ?demo=1 — scripted boards cycling through every callout, for previewing the
 * look. The cycle holds while `paused` (a standings showing is owed or on
 * air). Once, 20s into the first standings showing, it fires a blunder so the
 * demo also shows an alert cutting the table and the table coming back.
 */
function useDemo(
  team: string,
  enabled: boolean,
  paused: boolean,
  standingsOnAir: boolean
): { games: TrackedGame[]; active: ActiveMoment | null } {
  const games = useMemo(() => (enabled ? demoGames(team) : []), [team, enabled]);
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [alertOn, setAlertOn] = useState(false);
  const alertFiredRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    const cycle = () => {
      if (pausedRef.current) {
        timer = setTimeout(cycle, 1000);
        return;
      }
      setStep(index);
      setVisible(true);
      timer = setTimeout(() => {
        setVisible(false);
        index = (index + 1) % DEMO_SCRIPT.length;
        timer = setTimeout(cycle, 2500); // bars back on screen between callouts
      }, DEMO_SCRIPT_MS);
    };
    timer = setTimeout(cycle, 1500);
    return () => clearTimeout(timer);
  }, [enabled]);

  // The alert's own timers live apart from the effect that starts them: the
  // alert cuts the standings, which flips `standingsOnAir`, and an effect
  // cleanup there would cancel the timer that ends the alert — leaving it on
  // air forever with the boards hidden behind it.
  const alertTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!enabled || !standingsOnAir || alertFiredRef.current) return;
    alertFiredRef.current = true;
    alertTimersRef.current.push(
      setTimeout(() => {
        setAlertOn(true);
        alertTimersRef.current.push(setTimeout(() => setAlertOn(false), DEMO_SCRIPT_MS));
      }, DEMO_ALERT_AFTER_MS)
    );
  }, [enabled, standingsOnAir]);
  useEffect(() => {
    const timers = alertTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const active = useMemo((): ActiveMoment | null => {
    if (!enabled) return null;
    if (alertOn) return { moment: demoMoment(DEMO_ALERT, "alert"), game: games[DEMO_ALERT.boardIndex] };
    if (!visible || step < 0) return null;
    const current = DEMO_SCRIPT[step];
    return { moment: demoMoment(current, step), game: games[current.boardIndex] };
  }, [enabled, alertOn, visible, step, games]);

  return { games, active };
}

/** How long each demo callout stays up — matches demoMoment's duration. */
const DEMO_SCRIPT_MS = 5000;
/** How far into the first standings showing the demo's blunder breaks in. */
const DEMO_ALERT_AFTER_MS = 20_000;

export default function TeamPage() {
  const { section = "open" } = useParams<{ section: string }>();
  const [params] = useSearchParams();
  const team = params.get("team")?.trim() || DEFAULT_TEAM;
  // Default is chroma green for keying; ?bg=1 previews on the Olympiad backdrop,
  // ?bg=transparent relies on OBS browser-source alpha instead.
  const bgMode = params.get("bg") === "1" ? "backdrop" : params.get("bg") === "transparent" ? "transparent" : "chroma";
  const align = params.get("align") ?? "center";
  const scale = Number(params.get("scale")) || 1.6;
  const demo = params.get("demo") === "1";
  const momentsEnabled = params.get("moments") !== "0";
  // Minutes between standings showings (default 15); ?standings=0 turns them off
  const standingsParam = params.get("standings");
  const standingsEvery = standingsParam === null ? 15 : Math.max(0, Number(standingsParam) || 0);
  // Any tour id inside another team event's broadcast group works here
  const anchorTour = params.get("anchor")?.trim() || OLYMPIAD_ANCHOR_TOUR;

  const { sectionInfo, games: liveGames, roundName, error } = useOlympiadTeam({
    section,
    team,
    anchorTour,
    demo,
  });

  useEffect(() => {
    document.body.classList.add("team-view");
    document.body.classList.toggle("team-view-backdrop", bgMode === "backdrop");
    document.body.classList.toggle("team-view-chroma", bgMode === "chroma");
    return () => {
      document.body.classList.remove("team-view", "team-view-backdrop", "team-view-chroma");
    };
  }, [bgMode]);

  // The standings wait for the strip to be free; an alert (result, mate,
  // blunder) cuts them and sends viewers back to the boards, and lesser
  // callouts hold until the table has finished.
  const [momentOnAir, setMomentOnAir] = useState(false);
  const [alertOnAir, setAlertOnAir] = useState(false);
  const ticker = useStandingsTicker({
    section,
    team,
    everyMinutes: standingsEvery,
    demo,
    busy: momentOnAir,
    alert: alertOnAir,
  });

  const liveActive = useMoments(
    liveGames,
    team,
    momentsEnabled && !demo,
    ticker.standings !== null ? ALERT_PRIORITY : 0
  );
  const demoState = useDemo(team, demo, ticker.pending, ticker.standings !== null);
  const games = demo ? demoState.games : liveGames;
  const active = demo ? demoState.active : liveActive;

  useEffect(() => {
    setMomentOnAir(active !== null);
    setAlertOnAir(active !== null && active.moment.priority >= ALERT_PRIORITY);
  }, [active]);

  // The board the moment is about, numbered as it sits in the strip
  const activeBoard = active ? games.findIndex((game) => game.key === active.game.key) + 1 : 0;
  const bannerUp = active !== null || ticker.standings !== null;

  const opponent = useMemo(() => opponentOf(games, team), [games, team]);

  const score = matchScore(games, team);
  const projected = momentsEnabled ? projectedScore(games, team) : null;

  return (
    <div
      className={`team-overlay align-${align}`}
      style={{ "--team-scale": scale } as React.CSSProperties}
    >
      <header className="team-header">
        <span className="team-header-name">{team}</span>
        {opponent && (
          <>
            <span className="team-header-score">
              {formatPoints(score.us)}
              <span className="team-header-score-sep">–</span>
              {formatPoints(score.them)}
            </span>
            <span className="team-header-opponent">{opponent}</span>
          </>
        )}
        <span className="team-header-meta">
          {sectionInfo.label}
          {roundName ? ` · ${roundName}` : demo ? " · Demo" : ""}
        </span>
        {projected && opponent && (
          <span className="team-header-projected">
            Proj. {formatPoints(projected.us)}–{formatPoints(projected.them)}
          </span>
        )}
      </header>

      <div className={bannerUp ? "team-boards is-hidden" : "team-boards"}>
        <OlympiadGrid games={games} team={team} />
        {ticker.standings && (
          <StandingsBanner
            standings={ticker.standings}
            team={team}
            section={sectionInfo.label}
            onDone={ticker.done}
          />
        )}
        {active && <MomentBanner key={active.moment.id} active={active} board={activeBoard} team={team} />}
      </div>
      {games.length === 0 && error && <p className="team-waiting">Reconnecting to Lichess…</p>}
    </div>
  );
}

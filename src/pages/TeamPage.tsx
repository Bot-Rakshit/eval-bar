import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { TrackedGame } from "../types";
import OlympiadGrid from "../components/OlympiadGrid";
import { ActiveMoment, useMoments } from "../hooks/useMoments";
import { projectedScore } from "../lib/intel/moments";
import { DEFAULT_TEAM, OLYMPIAD_ANCHOR_TOUR, useOlympiadTeam } from "../hooks/useOlympiadTeam";
import { formatPoints, matchScore, opponentOf } from "../lib/teamScore";
import { DEMO_SCRIPT, demoGames, demoMoment } from "../lib/intel/demo";
import { MomentBanner, StandingsBanner } from "../components/Banner";
import { useStandingsTicker } from "../hooks/useStandingsTicker";

/**
 * ?demo=1 — scripted boards cycling through every callout, for previewing the
 * look. The cycle holds while `paused` (the standings are on air).
 */
function useDemo(
  team: string,
  enabled: boolean,
  paused: boolean
): { games: TrackedGame[]; active: ActiveMoment | null } {
  const games = useMemo(() => (enabled ? demoGames(team) : []), [team, enabled]);
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);
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

  const active = useMemo((): ActiveMoment | null => {
    if (!enabled || !visible || step < 0) return null;
    const current = DEMO_SCRIPT[step];
    return { moment: demoMoment(current, step), game: games[current.boardIndex] };
  }, [enabled, visible, step, games]);

  return { games, active };
}

/** How long each demo callout stays up — matches demoMoment's duration. */
const DEMO_SCRIPT_MS = 5000;

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
  // Minutes between standings tickers; ?standings=0 turns them off
  const standingsParam = params.get("standings");
  const standingsEvery = standingsParam === null ? 10 : Math.max(0, Number(standingsParam) || 0);
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

  // The standings wait for a moment to clear; a moment that fires while the
  // standings are up is laid over them.
  const [momentOnAir, setMomentOnAir] = useState(false);
  const ticker = useStandingsTicker({
    section,
    team,
    everyMinutes: standingsEvery,
    demo,
    busy: momentOnAir,
  });

  const liveActive = useMoments(liveGames, team, momentsEnabled && !demo);
  const demoState = useDemo(team, demo, ticker.standings !== null);
  const games = demo ? demoState.games : liveGames;
  const active = demo ? demoState.active : liveActive;

  useEffect(() => setMomentOnAir(active !== null), [active]);

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
        {active && <MomentBanner key={active.moment.id} active={active} board={activeBoard} />}
      </div>
      {games.length === 0 && error && <p className="team-waiting">Reconnecting to Lichess…</p>}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { TrackedGame } from "../types";
import OlympiadGrid from "../components/OlympiadGrid";
import { ActiveMoment, useMoments } from "../hooks/useMoments";
import { projectedScore } from "../lib/intel/moments";
import { DEFAULT_TEAM, OLYMPIAD_ANCHOR_TOUR, useOlympiadTeam } from "../hooks/useOlympiadTeam";
import { formatPoints, matchScore, opponentOf } from "../lib/teamScore";
import { DEMO_SCRIPT, demoGames, demoMoment } from "../lib/intel/demo";

/** ?demo=1 — scripted boards cycling through every callout, for previewing the look. */
function useDemo(team: string, enabled: boolean): { games: TrackedGame[]; active: ActiveMoment | null } {
  const games = useMemo(() => (enabled ? demoGames(team) : []), [team, enabled]);
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    const cycle = () => {
      setStep(index);
      setVisible(true);
      timer = setTimeout(() => {
        setVisible(false);
        index = (index + 1) % DEMO_SCRIPT.length;
        timer = setTimeout(cycle, 2500); // bars back on screen between callouts
      }, 4500);
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

/** Step the type down for long lines so a 12-letter surname still fits on one line. */
function headlineSize(text: string): string {
  if (text.length > 26) return "size-s";
  if (text.length > 20) return "size-m";
  return "";
}

/** Full-width headline that takes over the bar strip for a few seconds. */
function MomentTakeover({ active }: { active: ActiveMoment }) {
  const { moment } = active;
  return (
    <div
      key={moment.id}
      className={`moment-takeover tone-${moment.tone}`}
      style={{ "--moment-ms": `${moment.durationMs}ms` } as React.CSSProperties}
    >
      <span className={`moment-headline ${headlineSize(moment.text)}`}>{moment.text}</span>
    </div>
  );
}

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

  const liveActive = useMoments(liveGames, team, momentsEnabled && !demo);
  const demoState = useDemo(team, demo);
  const games = demo ? demoState.games : liveGames;
  const active = demo ? demoState.active : liveActive;

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

      <div className={active ? "team-boards is-hidden" : "team-boards"}>
        {active && <MomentTakeover active={active} />}
        <OlympiadGrid games={games} team={team} />
      </div>
      {games.length === 0 && error && <p className="team-waiting">Reconnecting to Lichess…</p>}
    </div>
  );
}

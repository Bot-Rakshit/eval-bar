import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BarCustomizations, DEFAULT_CUSTOMIZATIONS, TrackedGame } from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useTeamRound, teamMatches } from "../hooks/useTeamRound";
import { useTrackedGames } from "../hooks/useTrackedGames";
import EvalBarGrid from "../components/EvalBarGrid";
import { ActiveMoment, useMoments } from "../hooks/useMoments";
import { projectedScore } from "../lib/intel/moments";
import { DEMO_SCRIPT, demoGames, demoMoment } from "../lib/intel/demo";

/** Any tour in the Olympiad group — the group lists every section. */
const OLYMPIAD_ANCHOR_TOUR = "n1pPI5Q0";
const DEFAULT_TEAM = "India";
const TEAM_COLOR = "#F5C95B";

const SECTIONS: Record<string, { prefix: string; label: string }> = {
  open: { prefix: "Open", label: "Open" },
  women: { prefix: "Women", label: "Women" },
};

/** Tuned for the navy/gold Olympiad backdrop the bars sit on. */
const OLYMPIAD_THEME: BarCustomizations = {
  ...DEFAULT_CUSTOMIZATIONS,
  // Opaque so nothing bleeds through on a chroma key
  containerBackground: "linear-gradient(180deg, #06254a, #021428)",
  containerBorderColor: "#c4b077",
  whiteBarColor: "#f3ead0",
  blackBarColor: "#0b1c30",
  whitePlayerBackground: "Transparent",
  blackPlayerBackground: "Transparent",
  whitePlayerNameColor: "#ffffff",
  blackPlayerNameColor: "#ffffff",
  turnArrowColor: "#c4b077",
  barWidth: 22,
  barGap: 8,
  barHeight: 26,
  showClocks: true,
  showMoveNumber: true,
  sortByEval: false,
  hideFinished: false,
  layoutDirection: "row",
  showRoundName: false,
};

function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole >= 0.5;
  if (whole === 0 && half) return "½";
  return half ? `${whole}½` : `${whole}`;
}

/** Match score from the team's perspective; only decided games count. */
function matchScore(games: TrackedGame[], team: string): { us: number; them: number } {
  let us = 0;
  let them = 0;
  for (const game of games) {
    if (!game.result) continue;
    const teamIsWhite = teamMatches(game.whiteTeam, team);
    if (game.result === "1/2-1/2") {
      us += 0.5;
      them += 0.5;
    } else if ((game.result === "1-0") === teamIsWhite) {
      us += 1;
    } else {
      them += 1;
    }
  }
  return { us, them };
}

const BOARDS_PER_MATCH = 4;

/** Stand-in bars for boards whose pairings haven't been published yet. */
function PlaceholderBars({
  team,
  theme,
  boards,
}: {
  team: string;
  theme: BarCustomizations;
  boards: number[];
}) {
  return (
    <div className="eval-bars-container">
      <div className="eval-bars-grid" style={{ gap: `${theme.barGap}px` }}>
        {boards.map((board) => (
          <div
            key={board}
            className="eval-container placeholder-bar"
            style={{
              width: `${theme.barWidth}%`,
              background: theme.containerBackground,
              border: `1px solid ${theme.containerBorderColor}`,
            }}
          >
            <div className="player-names">
              <span className="white-player team-player" style={{ color: TEAM_COLOR }}>
                {team}
              </span>
              <span className="black-player placeholder-muted">Board {board}</span>
            </div>
            <div className="player-names placeholder-muted" style={{ alignItems: "center" }}>
              <span className="white-player">1:30:00</span>
              <span className="black-player">1:30:00</span>
            </div>
            <div className="placeholder-eval">
              <div
                className="eval-bars"
                style={{ height: `${theme.barHeight}px`, background: theme.blackBarColor }}
              >
                <div className="white-bar" style={{ width: "50%", background: theme.whiteBarColor }} />
                <div className="zero-marker" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const sectionInfo = SECTIONS[section.toLowerCase()] ?? SECTIONS.open;
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

  const { target, error } = useTeamRound(demo ? "" : anchorTour, sectionInfo.prefix, team);
  const { snapshots } = useRoundStream(target?.roundId ?? null);

  useEffect(() => {
    document.body.classList.add("team-view");
    document.body.classList.toggle("team-view-backdrop", bgMode === "backdrop");
    document.body.classList.toggle("team-view-chroma", bgMode === "chroma");
    return () => {
      document.body.classList.remove("team-view", "team-view-backdrop", "team-view-chroma");
    };
  }, [bgMode]);

  // Prefer PGN team tags; fall back to the names discovered from the round API.
  const selectedKeys = useMemo((): string[] => {
    const players = target?.players ?? [];
    return Array.from(snapshots.values())
      .filter(
        (snapshot) =>
          teamMatches(snapshot.whiteTeam, team) ||
          teamMatches(snapshot.blackTeam, team) ||
          players.includes(snapshot.whitePlayer) ||
          players.includes(snapshot.blackPlayer)
      )
      .sort((a, b) => a.board - b.board)
      .map((snapshot) => snapshot.key);
  }, [snapshots, target, team]);

  const { games: liveGames } = useTrackedGames(snapshots, selectedKeys);
  const liveActive = useMoments(liveGames, team, momentsEnabled && !demo);
  const demoState = useDemo(team, demo);
  const games = demo ? demoState.games : liveGames;
  const active = demo ? demoState.active : liveActive;

  const opponent = useMemo(() => {
    for (const game of games) {
      if (game.whiteTeam && !teamMatches(game.whiteTeam, team)) return game.whiteTeam;
      if (game.blackTeam && !teamMatches(game.blackTeam, team)) return game.blackTeam;
    }
    return "";
  }, [games, team]);

  const score = matchScore(games, team);
  const projected = momentsEnabled ? projectedScore(games, team) : null;
  const highlight = useMemo(() => ({ team, color: TEAM_COLOR }), [team]);

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
          {target ? ` · ${target.roundName}` : demo ? " · Demo" : ""}
        </span>
        {projected && opponent && (
          <span className="team-header-projected">
            Proj. {formatPoints(projected.us)}–{formatPoints(projected.them)}
          </span>
        )}
      </header>

      <div className={active ? "team-boards is-hidden" : "team-boards"}>
        {active && <MomentTakeover active={active} />}
        {games.length > 0 && (
          <EvalBarGrid games={games} customizations={OLYMPIAD_THEME} highlight={highlight} />
        )}
        {games.length < BOARDS_PER_MATCH && (
          <PlaceholderBars
            team={team}
            theme={OLYMPIAD_THEME}
            boards={Array.from(
              { length: BOARDS_PER_MATCH - games.length },
              (_, index) => games.length + index + 1
            )}
          />
        )}
      </div>
      {games.length === 0 && error && <p className="team-waiting">Reconnecting to Lichess…</p>}
    </div>
  );
}

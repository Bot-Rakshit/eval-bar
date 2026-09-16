import React, { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BarCustomizations, DEFAULT_CUSTOMIZATIONS, TrackedGame } from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useTeamRound, teamMatches } from "../hooks/useTeamRound";
import { useTrackedGames } from "../hooks/useTrackedGames";
import EvalBarGrid from "../components/EvalBarGrid";

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
  // Any tour id inside another team event's broadcast group works here
  const anchorTour = params.get("anchor")?.trim() || OLYMPIAD_ANCHOR_TOUR;

  const { target, error } = useTeamRound(anchorTour, sectionInfo.prefix, team);
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

  const { games } = useTrackedGames(snapshots, selectedKeys);

  const opponent = useMemo(() => {
    for (const game of games) {
      if (game.whiteTeam && !teamMatches(game.whiteTeam, team)) return game.whiteTeam;
      if (game.blackTeam && !teamMatches(game.blackTeam, team)) return game.blackTeam;
    }
    return "";
  }, [games, team]);

  const score = matchScore(games, team);
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
          {target ? ` · ${target.roundName}` : ""}
        </span>
      </header>

      <div className="team-boards">
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

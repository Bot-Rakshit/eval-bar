import React, { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Scorecard from "../components/Scorecard";
import { DEFAULT_TEAM, OLYMPIAD_ANCHOR_TOUR, useOlympiadTeam } from "../hooks/useOlympiadTeam";
import { demoGames } from "../lib/intel/demo";

/**
 * `/scorecard/:section` — the match score as a small box, for a corner of the
 * broadcast. Same query string as the bar overlay: ?team, ?bg, ?scale, ?align,
 * ?anchor, ?demo.
 */
export default function ScorecardPage() {
  const { section = "open" } = useParams<{ section: string }>();
  const [params] = useSearchParams();
  const team = params.get("team")?.trim() || DEFAULT_TEAM;
  // Default is chroma green for keying; ?bg=1 previews on the Olympiad backdrop,
  // ?bg=transparent relies on OBS browser-source alpha instead.
  const bgMode =
    params.get("bg") === "1" ? "backdrop" : params.get("bg") === "transparent" ? "transparent" : "chroma";
  const align = params.get("align") ?? "center";
  const scale = Number(params.get("scale")) || 1.6;
  const demo = params.get("demo") === "1";
  const showProjection = params.get("proj") !== "0";
  const showFlags = params.get("flags") !== "0";
  const anchorTour = params.get("anchor")?.trim() || OLYMPIAD_ANCHOR_TOUR;

  const { sectionInfo, games: liveGames, roundName } = useOlympiadTeam({
    section,
    team,
    anchorTour,
    demo,
  });
  const games = demo ? demoGames(team) : liveGames;

  const round = demo ? "Demo" : roundName;
  const label = params.get("round") === "0" ? null : [sectionInfo.label, round].filter(Boolean).join(" · ");

  useEffect(() => {
    document.body.classList.add("team-view");
    document.body.classList.toggle("team-view-backdrop", bgMode === "backdrop");
    document.body.classList.toggle("team-view-chroma", bgMode === "chroma");
    return () => {
      document.body.classList.remove("team-view", "team-view-backdrop", "team-view-chroma");
    };
  }, [bgMode]);

  return (
    <div className={`score-page align-${align}`}>
      <div className="score-scale" style={{ "--score-scale": scale } as React.CSSProperties}>
        <Scorecard
          games={games}
          team={team}
          showProjection={showProjection}
          showFlags={showFlags}
          label={label}
        />
      </div>
    </div>
  );
}

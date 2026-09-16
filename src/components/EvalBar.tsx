import { useEffect, useRef, useState } from "react";
import { BarCustomizations, TrackedGame } from "../types";
import { formatPlayerName } from "../lib/playerName";
import "./EvalBar.css";

/** Colour one team's players the same way regardless of the side they play. */
export interface TeamHighlight {
  team: string;
  color: string;
}

interface EvalBarProps {
  game: TrackedGame;
  customizations: BarCustomizations;
  width?: string;
  highlight?: TeamHighlight;
}

const RESULT_LABELS: Record<string, string> = {
  "1-0": "1-0",
  "0-1": "0-1",
  "1/2-1/2": "½-½",
};

function clampEvalToSegment(evaluation: number): number {
  return Math.min(Math.max(Math.round(evaluation), -5), 5);
}

function whiteBarWidth(game: TrackedGame): string {
  const { result, mateIn, evaluation } = game;
  if (result === "1-0") return "100%";
  if (result === "0-1") return "0%";
  if (result === "1/2-1/2") return "50%";
  if (mateIn !== null) return mateIn > 0 ? "100%" : "0%";
  if (evaluation === null) return "50%";
  if (evaluation >= 99) return "100%";
  if (evaluation >= 4) return "90%";
  if (evaluation <= -4) return "10%";
  return `${50 + clampEvalToSegment(evaluation) * 7.5}%`;
}

function formatEvaluation(game: TrackedGame): string {
  const { result, mateIn, evaluation } = game;
  if (result) return RESULT_LABELS[result];
  if (mateIn !== null) {
    if (mateIn === 0) return "Checkmate";
    return `M${mateIn}`;
  }
  if (evaluation === null) return "…";
  if (evaluation < -1000 || evaluation > 1000) return "Checkmate";
  const formatted = evaluation.toFixed(1);
  return evaluation > 0 ? `+${formatted}` : formatted;
}

function formatClock(seconds: number): string {
  if (seconds < 1) return "0:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

function isTeam(candidate: string, team: string): boolean {
  return candidate.trim().toLowerCase() === team.trim().toLowerCase();
}

export function EvalBar({ game, customizations, width, highlight }: EvalBarProps) {
  const [secondsSinceLastMove, setSecondsSinceLastMove] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { turn, result, whiteClock, blackClock, moveNumber, alert } = game;

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (turn !== "" && !result) {
      setSecondsSinceLastMove(0);
      intervalRef.current = setInterval(() => {
        setSecondsSinceLastMove((value) => value + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [turn, result]);

  const liveWhiteClock = turn === "white" ? whiteClock - secondsSinceLastMove : whiteClock;
  const liveBlackClock = turn === "black" ? blackClock - secondsSinceLastMove : blackClock;

  // Before the first move Lichess reports no clocks — don't flash 0:00:00 in red
  const clocksUnknown = whiteClock === 0 && blackClock === 0;
  const clockColor = (liveClock: number, baseColor: string) =>
    !clocksUnknown && liveClock <= 30 ? "red" : baseColor;
  const clockText = (liveClock: number) => (clocksUnknown ? "–:––:––" : formatClock(liveClock));

  const whiteIsTeam = highlight !== undefined && isTeam(game.whiteTeam, highlight.team);
  const blackIsTeam = highlight !== undefined && isTeam(game.blackTeam, highlight.team);
  const whiteNameColor = whiteIsTeam ? highlight!.color : customizations.whitePlayerNameColor;
  const blackNameColor = blackIsTeam ? highlight!.color : customizations.blackPlayerNameColor;

  return (
    <div
      className={`eval-container ${alert ? "blink-border" : ""}`}
      style={{
        width: width ?? `${customizations.barWidth}%`,
        background: customizations.containerBackground,
        border: `1px solid ${customizations.containerBorderColor}`,
      }}
    >
      <div className="player-names">
        <span
          className={whiteIsTeam ? "white-player team-player" : "white-player"}
          style={{
            background: customizations.whitePlayerBackground,
            color: whiteNameColor,
            fontSize: "1.1rem",
            padding: "2px 8px",
            maxWidth: "45%",
            fontWeight: "bold",
          }}
        >
          {formatPlayerName(game.whitePlayer, highlight !== undefined)}
        </span>
        <span
          className={blackIsTeam ? "black-player team-player" : "black-player"}
          style={{
            background: customizations.blackPlayerBackground,
            color: blackNameColor,
            fontSize: "1.1rem",
            padding: "2px 8px",
            maxWidth: "45%",
            fontWeight: "bold",
          }}
        >
          {formatPlayerName(game.blackPlayer, highlight !== undefined)}
        </span>
      </div>

      {customizations.showClocks && (
        <div className="player-names" style={{ alignItems: "center" }}>
          <span
            className="white-player"
            style={{
              background: customizations.whitePlayerBackground,
              color: clockColor(liveWhiteClock, whiteNameColor),
              fontSize: "0.8rem",
              padding: "2px 8px",
              maxWidth: "45%",
              fontWeight: "bold",
            }}
          >
            {clockText(liveWhiteClock)}
          </span>
          <div
            style={{
              border: "5px solid transparent",
              borderRight: `7px solid ${customizations.turnArrowColor}`,
              borderLeftWidth: "0px",
              opacity: turn === "white" ? 1 : 0.5,
            }}
          />
          {customizations.showMoveNumber && (
            <span
              style={{
                color: "white",
                fontSize: "0.8rem",
                padding: "2px",
                fontWeight: "bold",
              }}
            >
              {moveNumber}
            </span>
          )}
          <div
            style={{
              border: "5px solid transparent",
              borderLeft: `7px solid ${customizations.turnArrowColor}`,
              borderRightWidth: "0px",
              opacity: turn === "black" ? 1 : 0.5,
            }}
          />
          <span
            className="black-player"
            style={{
              background: customizations.blackPlayerBackground,
              color: clockColor(liveBlackClock, blackNameColor),
              fontSize: "0.8rem",
              padding: "2px 8px",
              maxWidth: "45%",
              fontWeight: "bold",
            }}
          >
            {clockText(liveBlackClock)}
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          flexGrow: 1,
          minHeight: "30px",
        }}
      >
        <span
          className={result !== null ? "result" : "evaluation-value"}
          style={{
            fontSize: "19px",
            color: result !== null ? "white" : "black",
            fontWeight: "bold",
            zIndex: 1,
            marginBottom: "2.5px",
          }}
        >
          {formatEvaluation(game)}
        </span>

        {result === null && (
          <div
            className="eval-bars"
            style={{
              height: `${customizations.barHeight}px`,
              background: customizations.blackBarColor,
            }}
          >
            <div
              className="white-bar"
              style={{
                width: whiteBarWidth(game),
                background: customizations.whiteBarColor,
              }}
            />
            <div className="zero-marker" />
          </div>
        )}
      </div>

      {alert && (
        <div
          style={{
            borderRadius: "50%",
            padding: "0px",
            background: "red",
            position: "absolute",
            top: "0px",
            right: "0px",
            animation: "pulse 1.5s infinite",
            fontSize: "12px",
          }}
        >
          ??
        </div>
      )}
    </div>
  );
}

export default EvalBar;

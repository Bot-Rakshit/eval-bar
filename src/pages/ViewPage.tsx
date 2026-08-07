import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoundInfo } from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useRoundMonitor } from "../hooks/useRoundMonitor";
import { useTrackedGames } from "../hooks/useTrackedGames";
import { decodeShareState, encodeShareState } from "../lib/shareState";
import { fetchTournamentRounds } from "../api/lichess";
import EvalBarGrid from "../components/EvalBarGrid";

export default function ViewPage() {
  const { stateData } = useParams<{ stateData: string }>();
  const navigate = useNavigate();
  const [roundName, setRoundName] = useState("");

  const shareState = useMemo(
    () => (stateData ? decodeShareState(stateData) : null),
    [stateData]
  );

  useEffect(() => {
    if (!shareState) {
      navigate("/", { replace: true });
    }
  }, [shareState, navigate]);

  // Chroma-key background only on this final screen (used inside OBS)
  useEffect(() => {
    document.body.classList.add("chroma-view");
    return () => document.body.classList.remove("chroma-view");
  }, []);

  // Resolve the round name for the on-overlay label
  useEffect(() => {
    if (!shareState?.customizations.showRoundName) {
      setRoundName("");
      return;
    }
    let cancelled = false;
    fetchTournamentRounds(shareState.tournamentId)
      .then((rounds) => {
        if (cancelled) return;
        setRoundName(rounds.find((round) => round.id === shareState.roundId)?.name ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shareState]);

  const { snapshots } = useRoundStream(shareState?.roundId ?? null);

  // Links may restrict the overlay to specific players (selected games or
  // followed players from the control page). Player-based filtering survives
  // round advances, including reversed colors.
  const selectedKeys = useMemo((): string[] | null => {
    const players = shareState?.players;
    if (!shareState || !players || players.length === 0) return null;
    return Array.from(snapshots.keys()).filter((key) =>
      players.some(
        (player) => key.startsWith(`${player} - `) || key.endsWith(` - ${player}`)
      )
    );
  }, [snapshots, shareState]);

  const { games } = useTrackedGames(snapshots, selectedKeys);

  const handleRoundAdvance = useCallback(
    (nextRound: RoundInfo) => {
      if (!shareState) return;
      const encoded = encodeShareState({
        version: 2,
        tournamentId: shareState.tournamentId,
        roundId: nextRound.id,
        customizations: shareState.customizations,
      });
      navigate(`/broadcast/${encoded}`, { replace: true });
    },
    [navigate, shareState]
  );

  useRoundMonitor(shareState?.tournamentId ?? null, shareState?.roundId ?? null, handleRoundAdvance);

  if (!shareState) return null;

  return (
    <>
      {shareState.customizations.showRoundName && roundName && (
        <div className="round-label">{roundName}</div>
      )}
      <EvalBarGrid games={games} customizations={shareState.customizations} />
    </>
  );
}

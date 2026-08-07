import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoundInfo } from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useRoundMonitor } from "../hooks/useRoundMonitor";
import { useTrackedGames } from "../hooks/useTrackedGames";
import { decodeShareState, encodeShareState } from "../lib/shareState";
import EvalBarGrid from "../components/EvalBarGrid";

export default function ViewPage() {
  const { stateData } = useParams<{ stateData: string }>();
  const navigate = useNavigate();

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

  const { snapshots } = useRoundStream(shareState?.roundId ?? null);
  const { games } = useTrackedGames(snapshots, null);

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

  return <EvalBarGrid games={games} customizations={shareState.customizations} />;
}

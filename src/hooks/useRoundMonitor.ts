import { useEffect, useRef } from "react";
import { RoundInfo } from "../types";
import { fetchTournamentRounds } from "../api/lichess";

const CHECK_INTERVAL_MS = 30000;

export function useRoundMonitor(
  tournamentId: string | null,
  roundId: string | null,
  onNextRound: (round: RoundInfo) => void
): void {
  const callbackRef = useRef(onNextRound);
  callbackRef.current = onNextRound;
  const transitionedRef = useRef(false);

  useEffect(() => {
    transitionedRef.current = false;
  }, [roundId]);

  useEffect(() => {
    if (!tournamentId || !roundId) return;

    const checkForNextRound = async () => {
      if (transitionedRef.current) return;
      try {
        const rounds = await fetchTournamentRounds(tournamentId);
        const currentIndex = rounds.findIndex((round) => round.id === roundId);
        const currentRound = currentIndex === -1 ? null : rounds[currentIndex];

        if (currentRound?.ongoing) return;

        let nextRound: RoundInfo | undefined;
        if (currentIndex !== -1) {
          nextRound = rounds.slice(currentIndex + 1).find((round) => round.ongoing);
        }
        if (!nextRound) {
          nextRound = rounds.find((round) => round.id !== roundId && round.ongoing);
        }
        if (!nextRound) return;

        transitionedRef.current = true;
        callbackRef.current(nextRound);
      } catch (error) {
        console.error("Round check failed:", error);
      }
    };

    void checkForNextRound();
    const interval = setInterval(() => void checkForNextRound(), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tournamentId, roundId]);
}

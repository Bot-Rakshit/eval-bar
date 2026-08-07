import { useEffect, useRef, useState } from "react";
import { GameSnapshot, TrackedGame, emptyTrackedGame, snapshotToTracked } from "../types";
import { snapshotsEqual } from "../lib/chess";
import { evaluateWithProgress } from "../lib/stockfishEngine";
import blunderSoundUrl from "../assets/blunder-sound.mp3";

const ALERT_DURATION_MS = 10000;
const BLUNDER_COOLDOWN_MS = 10000;
const BLUNDER_GRACE_PERIOD_MS = 5000;
const BLUNDER_SWING_THRESHOLD = 2;

export interface TrackedGamesResult {
  games: TrackedGame[];
  triggerDemoBlunder: () => void;
}

export function useTrackedGames(
  snapshots: Map<string, GameSnapshot>,
  selectedKeys: string[] | null
): TrackedGamesResult {
  const [games, setGames] = useState<TrackedGame[]>([]);

  const gamesRef = useRef(new Map<string, TrackedGame>());
  const orderRef = useRef<string[]>([]);
  const alertTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mountedRef = useRef(true);
  const lastBlunderAtRef = useRef(0);
  const startedAtRef = useRef(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const publish = () => {
    if (!mountedRef.current) return;
    const ordered = orderRef.current
      .map((key) => gamesRef.current.get(key))
      .filter((game): game is TrackedGame => game !== undefined);
    setGames(ordered);
  };

  const playBlunderSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(blunderSoundUrl);
        audioRef.current.volume = 0.8;
      }
      void audioRef.current.play().catch(() => {});
    } catch {
      /* audio unavailable */
    }
  };

  const triggerAlert = (key: string, withSound: boolean) => {
    const current = gamesRef.current.get(key);
    if (!current) return;
    if (withSound) playBlunderSound();

    gamesRef.current.set(key, { ...current, alert: true });
    publish();

    const existingTimeout = alertTimeoutsRef.current.get(key);
    if (existingTimeout) clearTimeout(existingTimeout);
    alertTimeoutsRef.current.set(
      key,
      setTimeout(() => {
        const game = gamesRef.current.get(key);
        if (game) {
          gamesRef.current.set(key, { ...game, alert: false });
          publish();
        }
        alertTimeoutsRef.current.delete(key);
      }, ALERT_DURATION_MS)
    );
  };

  const maybeBlunder = (key: string, previousEval: number | null, nextEval: number) => {
    if (previousEval === null) return;
    if (previousEval < -4 || previousEval > 4) return;
    if (Math.abs(nextEval - previousEval) < BLUNDER_SWING_THRESHOLD) return;

    const now = Date.now();
    if (now - startedAtRef.current < BLUNDER_GRACE_PERIOD_MS) return;
    if (now - lastBlunderAtRef.current < BLUNDER_COOLDOWN_MS) return;
    lastBlunderAtRef.current = now;
    triggerAlert(key, true);
  };

  const enqueueEvaluation = (key: string, fen: string) => {
    const game = gamesRef.current.get(key);
    if (!game) return;
    gamesRef.current.set(key, { ...game, lastEvaluatedFen: fen });

    void evaluateWithProgress(fen, (progress) => {
      const current = gamesRef.current.get(key);
      if (!current || current.fen !== fen) return; // stale result

      maybeBlunder(key, current.evaluation, progress.evaluation);
      gamesRef.current.set(key, {
        ...current,
        evaluation: progress.evaluation,
        mateIn: progress.mateIn,
        depth: progress.depth,
      });
      publish();
    }).then((result) => {
      if (!result) {
        const current = gamesRef.current.get(key);
        if (current && current.fen === fen) {
          gamesRef.current.set(key, { ...current, lastEvaluatedFen: "" });
        }
      }
    });
  };

  const selectedKeysKey = selectedKeys ? selectedKeys.join("|") : null;

  useEffect(() => {
    const targetKeys = selectedKeysKey ? selectedKeysKey.split("|") : Array.from(snapshots.keys());

    for (const key of Array.from(gamesRef.current.keys())) {
      if (!targetKeys.includes(key)) {
        gamesRef.current.delete(key);
        const timeout = alertTimeoutsRef.current.get(key);
        if (timeout) {
          clearTimeout(timeout);
          alertTimeoutsRef.current.delete(key);
        }
      }
    }
    orderRef.current = targetKeys;

    for (const key of targetKeys) {
      const snapshot = snapshots.get(key);
      const previous = gamesRef.current.get(key);

      if (!snapshot) {
        if (!previous) {
          const [whitePlayer, blackPlayer] = key.split(" - ");
          gamesRef.current.set(key, emptyTrackedGame(whitePlayer ?? key, blackPlayer ?? ""));
        }
        continue;
      }

      if (previous && snapshotsEqual(previous, snapshot)) continue;

      const merged = snapshotToTracked(snapshot, previous);
      gamesRef.current.set(key, merged);

      if (previous && previous.result === null && snapshot.result !== null) {
        triggerAlert(key, true);
      }

      if (snapshot.fen && snapshot.fen !== merged.lastEvaluatedFen && !snapshot.result) {
        enqueueEvaluation(key, snapshot.fen);
      }
    }

    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, selectedKeysKey]);

  useEffect(() => {
    mountedRef.current = true;
    const alertTimeouts = alertTimeoutsRef.current;
    return () => {
      mountedRef.current = false;
      for (const timeout of alertTimeouts.values()) clearTimeout(timeout);
    };
  }, []);

  const triggerDemoBlunder = () => {
    const keys = Array.from(gamesRef.current.keys());
    if (keys.length === 0) return;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    triggerAlert(randomKey, true);
  };

  return { games, triggerDemoBlunder };
}

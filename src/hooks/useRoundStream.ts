import { useEffect, useRef, useState } from "react";
import { GameSnapshot } from "../types";
import { fetchRoundGames, streamRoundPgn } from "../api/lichess";
import { gameKeyFromPgn, parseSnapshotFromPgn, snapshotFromApiGame, snapshotsEqual } from "../lib/chess";

const POLL_INTERVAL_MS = 45000;
const BOOTSTRAP_POLL_INTERVAL_MS = 30000;
const GAME_SEPARATOR = "\n\n\n";

export type StreamMode = "idle" | "stream" | "poll";

export interface RoundStreamState {
  snapshots: Map<string, GameSnapshot>;
  mode: StreamMode;
}

export function useRoundStream(roundId: string | null): RoundStreamState {
  const [snapshots, setSnapshots] = useState<Map<string, GameSnapshot>>(new Map());
  const [mode, setMode] = useState<StreamMode>("idle");

  const snapshotsRef = useRef(new Map<string, GameSnapshot>());
  const gameTextRef = useRef(new Map<string, string>());
  const remainderRef = useRef("");
  const pollingStartedRef = useRef(false);

  useEffect(() => {
    if (!roundId) {
      snapshotsRef.current = new Map();
      gameTextRef.current = new Map();
      remainderRef.current = "";
      pollingStartedRef.current = false;
      setSnapshots(new Map());
      setMode("idle");
      return;
    }

    snapshotsRef.current = new Map();
    gameTextRef.current = new Map();
    remainderRef.current = "";
    pollingStartedRef.current = false;
    setSnapshots(new Map());
    setMode("stream");

    const controller = new AbortController();
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;
    let bootstrapTimeout: ReturnType<typeof setTimeout> | null = null;
    let streamDelivered = false;

    const publish = () => {
      if (!cancelled) {
        setSnapshots(new Map(snapshotsRef.current));
      }
    };

    const handleChunk = (text: string) => {
      remainderRef.current += text;
      const segments = remainderRef.current.split(GAME_SEPARATOR);
      const endsClean = remainderRef.current.endsWith(GAME_SEPARATOR);
      const completeSegments = endsClean ? segments : segments.slice(0, -1);
      remainderRef.current = endsClean ? "" : segments[segments.length - 1];

      let changed = false;
      for (const segment of completeSegments) {
        const trimmed = segment.trim();
        if (!trimmed) continue;
        const key = gameKeyFromPgn(trimmed);
        if (!key) continue;
        if (gameTextRef.current.get(key) === trimmed) continue;
        gameTextRef.current.set(key, trimmed);

        const snapshot = parseSnapshotFromPgn(trimmed);
        if (!snapshot) continue;
        const previous = snapshotsRef.current.get(key);
        if (previous && snapshotsEqual(previous, snapshot)) continue;
        snapshotsRef.current.set(key, snapshot);
        changed = true;
      }
      if (changed) {
        streamDelivered = true;
        publish();
      }
    };

    const fetchAndMerge = async () => {
      try {
        const apiGames = await fetchRoundGames(roundId, controller.signal);
        let changed = false;
        for (const [index, apiGame] of apiGames.entries()) {
          const snapshot = snapshotFromApiGame(apiGame, index + 1);
          if (!snapshot) continue;
          const previous = snapshotsRef.current.get(snapshot.key);
          if (previous && snapshotsEqual(previous, snapshot)) continue;
          snapshotsRef.current.set(snapshot.key, snapshot);
          changed = true;
        }
        if (changed) publish();
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Round polling failed:", error);
        }
      }
    };

    const poll = async () => {
      await fetchAndMerge();
      if (!cancelled) {
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    // The PGN stream stays silent until a game has moves, so pull the
    // pairings from the round API until the stream delivers something.
    const bootstrap = async () => {
      if (cancelled || streamDelivered || pollingStartedRef.current) return;
      await fetchAndMerge();
      if (!cancelled && !streamDelivered && !pollingStartedRef.current) {
        bootstrapTimeout = setTimeout(bootstrap, BOOTSTRAP_POLL_INTERVAL_MS);
      }
    };
    void bootstrap();

    const startPolling = () => {
      if (pollingStartedRef.current || cancelled) return;
      pollingStartedRef.current = true;
      setMode("poll");
      void poll();
    };

    streamRoundPgn(roundId, controller.signal, handleChunk)
      .then(() => {
        // Stream closed cleanly — keep data flowing via polling
        startPolling();
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("PGN stream failed, falling back to polling:", error);
          startPolling();
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (pollTimeout) clearTimeout(pollTimeout);
      if (bootstrapTimeout) clearTimeout(bootstrapTimeout);
    };
  }, [roundId]);

  return { snapshots, mode };
}

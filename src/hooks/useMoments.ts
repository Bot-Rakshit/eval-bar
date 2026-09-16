import { useEffect, useRef, useState } from "react";
import { TrackedGame } from "../types";
import { BoardMemory, detectMoments, freshMemory, Moment } from "../lib/intel/moments";

const MAX_QUEUE = 3;
const GAP_MS = 500;

export interface ActiveMoment {
  moment: Moment;
  game: TrackedGame;
}

/**
 * Watches tracked games and surfaces one on-air "moment" at a time for the
 * whole overlay, queued by priority. The bars make way for it while it shows.
 */
export function useMoments(games: TrackedGame[], team: string, enabled = true): ActiveMoment | null {
  const [active, setActive] = useState<ActiveMoment | null>(null);
  const memoryRef = useRef(new Map<string, BoardMemory>());
  const queueRef = useRef<ActiveMoment[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();

    const show = () => {
      const next = queueRef.current.shift();
      if (!next) {
        timerRef.current = null;
        return;
      }
      setActive(next);
      timerRef.current = setTimeout(() => {
        setActive(null);
        timerRef.current = setTimeout(show, GAP_MS);
      }, next.moment.durationMs);
    };

    let queued = false;
    for (const game of games) {
      let memory = memoryRef.current.get(game.key);
      if (!memory) {
        memory = freshMemory();
        memoryRef.current.set(game.key, memory);
      }
      for (const moment of detectMoments(game, memory, team, now)) {
        queueRef.current.push({ moment, game });
        queued = true;
      }
    }
    if (queued) {
      queueRef.current.sort((a, b) => b.moment.priority - a.moment.priority);
      queueRef.current = queueRef.current.slice(0, MAX_QUEUE);
      if (timerRef.current === null) show();
    }
  }, [games, team, enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return active;
}

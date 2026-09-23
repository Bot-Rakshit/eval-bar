import { useCallback, useEffect, useRef, useState } from "react";
import { TrackedGame } from "../types";
import { BoardMemory, detectMoments, freshMemory, Moment } from "../lib/intel/moments";

/** Only the single most important pending moment is kept — never a backlog. */
const MAX_QUEUE = 1;
/** Quiet time after a headline before another may show. */
const COOLDOWN_MS = 30000;

export interface ActiveMoment {
  moment: Moment;
  game: TrackedGame;
}

/**
 * Watches tracked games and surfaces one on-air "moment" at a time for the
 * whole overlay — at most one every 30 seconds so it never feels like a
 * ticker. The bars make way for it while it shows.
 *
 * `holdBelow` keeps lesser moments queued while something else owns the strip:
 * with the standings up it is ALERT_PRIORITY, so a blunder still breaks in but
 * time trouble waits until the table has finished.
 */
export function useMoments(
  games: TrackedGame[],
  team: string,
  enabled = true,
  holdBelow = 0
): ActiveMoment | null {
  const [active, setActive] = useState<ActiveMoment | null>(null);
  const memoryRef = useRef(new Map<string, BoardMemory>());
  const queueRef = useRef<ActiveMoment[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRef = useRef(holdBelow);
  holdRef.current = holdBelow;

  const show = useCallback(() => {
    const next = queueRef.current[0];
    if (!next || next.moment.priority < holdRef.current) {
      // Nothing to show, or it has to wait — re-checked when the hold lifts
      timerRef.current = null;
      return;
    }
    queueRef.current.shift();
    setActive(next);
    timerRef.current = setTimeout(() => {
      setActive(null);
      timerRef.current = setTimeout(show, COOLDOWN_MS);
    }, next.moment.durationMs);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();

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
  }, [games, team, enabled, show]);

  // A held moment goes out as soon as whatever held it has finished
  useEffect(() => {
    if (timerRef.current === null) show();
  }, [holdBelow, show]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return active;
}

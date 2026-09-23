import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_STANDINGS, fetchStandings, Standings } from "../api/standings";

interface Options {
  section: string;
  team: string;
  /** Minutes between showings; 0 turns the ticker off. */
  everyMinutes: number;
  demo: boolean;
  /** True while something else (a moment) is on air — the ticker waits its turn. */
  busy: boolean;
}

/** In the demo the ticker comes round far more often, so it can be seen. */
const DEMO_EVERY_MS = 45_000;
/** Before the first showing, so an operator sees it work soon after going live. */
const FIRST_SHOWING_MS = 60_000;
// Lands in the demo's first gap between callouts (they run 5s on, 2.5s off
// from 1.5s in), so the table shows straight away instead of queueing.
const DEMO_FIRST_SHOWING_MS = 7_000;
// Short enough to always catch a gap between callouts rather than
// repeatedly landing inside one.
const BUSY_RETRY_MS = 1_000;

/**
 * Brings the standings banner round on a timer. Fetches fresh each time it is
 * due (the relay is edge-cached, so that is cheap); if the fetch fails it just
 * skips a turn rather than showing stale or empty data.
 */
export function useStandingsTicker({ section, team, everyMinutes, demo, busy }: Options) {
  const [standings, setStandings] = useState<Standings | null>(null);
  const [visible, setVisible] = useState(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The current fetch-and-show step, so `done` can book the next one. */
  const dueRef = useRef<() => void>(() => {});

  const enabled = everyMinutes > 0 && (section === "open" || section === "men" || section === "women");
  const everyMs = demo ? DEMO_EVERY_MS : everyMinutes * 60_000;

  const schedule = useCallback((delay: number, run: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(run, delay);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const due = async () => {
      if (busyRef.current) {
        schedule(BUSY_RETRY_MS, due);
        return;
      }
      try {
        const next = demo ? DEMO_STANDINGS : await fetchStandings(section, team, controller.signal);
        if (next.top.length === 0) throw new Error("empty table");
        setStandings(next);
        setVisible(true);
        // The next showing is booked when this one finishes (see `done`).
      } catch {
        if (!controller.signal.aborted) schedule(everyMs, due);
      }
    };
    dueRef.current = due;

    schedule(demo ? DEMO_FIRST_SHOWING_MS : FIRST_SHOWING_MS, due);
    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, demo, section, team, everyMs, schedule]);

  const done = useCallback(() => {
    setVisible(false);
    schedule(everyMs, () => dueRef.current());
  }, [everyMs, schedule]);

  return { standings: visible ? standings : null, done };
}

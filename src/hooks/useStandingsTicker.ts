import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_STANDINGS, fetchStandings, Standings } from "../api/standings";

interface Options {
  section: string;
  team: string;
  /** Minutes between showings; 0 turns the ticker off. */
  everyMinutes: number;
  demo: boolean;
  /** Any moment on air — a showing waits for the strip to be free. */
  busy: boolean;
  /** An alert on air (result, mate, blunder) — cuts a showing in progress. */
  alert: boolean;
}

/** The demo comes round far sooner than 7 minutes so it can be watched. */
const DEMO_EVERY_MS = 150_000;
/** Before the first showing, so an operator sees it work soon after going live. */
const FIRST_SHOWING_MS = 60_000;
const DEMO_FIRST_SHOWING_MS = 7_000;
/**
 * The boards get this long on screen after a moment before the table comes
 * (back) up — an alert sends viewers to the boards, so let them look.
 */
const BARS_AFTER_MOMENT_MS = 12_000;
const DEMO_BARS_AFTER_MOMENT_MS = 3_000;
const POLL_MS = 1_000;

/**
 * Brings the standings round every N minutes on a fixed cadence. Each slot
 * makes a showing owed; it goes out as soon as the strip is free. An alert cuts
 * a showing short and it is owed again, so it comes back once the alert has
 * cleared and the boards have had their moment — the table is not lost until
 * the next slot. A failed fetch skips the turn rather than showing stale data.
 */
export function useStandingsTicker({ section, team, everyMinutes, demo, busy, alert }: Options) {
  const [standings, setStandings] = useState<Standings | null>(null);
  const [visible, setVisible] = useState(false);
  const [owed, setOwed] = useState(false);

  const owedRef = useRef(false);
  const visibleRef = useRef(false);
  const busyRef = useRef(busy);
  const notBeforeRef = useRef(0);
  busyRef.current = busy;

  const enabled = everyMinutes > 0 && (section === "open" || section === "men" || section === "women");
  const everyMs = demo ? DEMO_EVERY_MS : everyMinutes * 60_000;
  const barsAfterMoment = demo ? DEMO_BARS_AFTER_MOMENT_MS : BARS_AFTER_MOMENT_MS;

  const markOwed = useCallback((value: boolean) => {
    owedRef.current = value;
    setOwed(value);
  }, []);

  const markVisible = useCallback((value: boolean) => {
    visibleRef.current = value;
    setVisible(value);
  }, []);

  // The cadence: every slot makes a showing owed
  useEffect(() => {
    if (!enabled) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(
      () => {
        markOwed(true);
        interval = setInterval(() => markOwed(true), everyMs);
      },
      demo ? DEMO_FIRST_SHOWING_MS : FIRST_SHOWING_MS
    );
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [enabled, demo, everyMs, markOwed]);

  // Put an owed showing on air once the strip is free
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const poll = setInterval(async () => {
      if (busyRef.current) {
        notBeforeRef.current = Date.now() + barsAfterMoment;
        return;
      }
      if (!owedRef.current || visibleRef.current || Date.now() < notBeforeRef.current) return;
      markOwed(false);
      try {
        const next = demo ? DEMO_STANDINGS : await fetchStandings(section, team, controller.signal);
        if (next.top.length === 0) return;
        setStandings(next);
        markVisible(true);
      } catch {
        // Skip this turn; the next slot tries again
      }
    }, POLL_MS);
    return () => {
      controller.abort();
      clearInterval(poll);
    };
  }, [enabled, demo, section, team, barsAfterMoment, markOwed, markVisible]);

  // An alert cuts the table; it is owed again and returns after the alert
  useEffect(() => {
    if (alert && visibleRef.current) {
      markVisible(false);
      markOwed(true);
    }
  }, [alert, markOwed, markVisible]);

  const done = useCallback(() => markVisible(false), [markVisible]);

  return {
    standings: visible ? standings : null,
    /** A showing is owed or on air — the demo's callouts hold off meanwhile. */
    pending: owed || visible,
    done,
  };
}

import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BarCustomizations, TrackedGame } from "../types";
import { cardStyleClass, cardThemeVars } from "../lib/cardTheme";
import OlympiadCard, { CARD_W } from "./OlympiadCard";

interface EvalBarGridProps {
  games: TrackedGame[];
  customizations: BarCustomizations;
  /** Team whose players are picked out in the highlight colour. */
  team?: string;
}

/** Ongoing games rank by how decisive they are; finished games go last. */
function decisiveness(game: TrackedGame): number {
  if (game.result) return -1;
  return Math.abs(game.evaluation ?? 0);
}

/**
 * A slot as wide as the operator asked for, with the card zoomed to fill it.
 * The card is authored at a fixed size (its notch and corners are drawn to
 * it), so it scales as a whole rather than stretching.
 */
function ScaledSlot({ width, children }: { width: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setZoom(el.clientWidth > 0 ? el.clientWidth / CARD_W : 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="board-card-slot" style={{ width }}>
      <div className="board-card-zoom" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}

export function EvalBarGrid({ games, customizations, team }: EvalBarGridProps) {
  const visibleGames = useMemo(() => {
    let list = customizations.hideFinished ? games.filter((game) => !game.result) : games;
    if (customizations.sortByEval) {
      list = [...list].sort((a, b) => decisiveness(b) - decisiveness(a));
    }
    return list;
  }, [games, customizations.hideFinished, customizations.sortByEval]);

  const themeVars = useMemo(() => cardThemeVars(customizations), [customizations]);
  const isColumn = customizations.layoutDirection === "column";

  return (
    <div className="eval-bars-container">
      <div
        className={isColumn ? "eval-bars-grid column" : "eval-bars-grid"}
        style={{
          gap: `${customizations.barGap}px`,
          ...(isColumn ? { width: `${customizations.barWidth}%` } : {}),
        }}
      >
        {visibleGames.map((game, index) => (
          <ScaledSlot key={game.key} width={isColumn ? "100%" : `${customizations.barWidth}%`}>
            <OlympiadCard
              game={game}
              board={game.board || index + 1}
              team={team}
              className={cardStyleClass(customizations.cardFrame, customizations.barShape)}
              style={themeVars}
              showClocks={customizations.showClocks}
              showMoveNumber={customizations.showMoveNumber}
              showAlert
            />
          </ScaledSlot>
        ))}
      </div>
    </div>
  );
}

export default EvalBarGrid;

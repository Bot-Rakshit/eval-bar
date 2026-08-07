import { useMemo } from "react";
import { BarCustomizations, TrackedGame } from "../types";
import EvalBar from "./EvalBar";

interface EvalBarGridProps {
  games: TrackedGame[];
  customizations: BarCustomizations;
}

/** Ongoing games rank by how decisive they are; finished games go last. */
function decisiveness(game: TrackedGame): number {
  if (game.result) return -1;
  return Math.abs(game.evaluation ?? 0);
}

export function EvalBarGrid({ games, customizations }: EvalBarGridProps) {
  const visibleGames = useMemo(() => {
    let list = customizations.hideFinished ? games.filter((game) => !game.result) : games;
    if (customizations.sortByEval) {
      list = [...list].sort((a, b) => decisiveness(b) - decisiveness(a));
    }
    return list;
  }, [games, customizations.hideFinished, customizations.sortByEval]);

  return (
    <div className="eval-bars-container">
      <div className="eval-bars-grid" style={{ gap: `${customizations.barGap}px` }}>
        {visibleGames.map((game) => (
          <EvalBar key={game.key} game={game} customizations={customizations} />
        ))}
      </div>
    </div>
  );
}

export default EvalBarGrid;

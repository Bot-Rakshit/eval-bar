import { BarCustomizations, TrackedGame } from "../types";
import EvalBar from "./EvalBar";

interface EvalBarGridProps {
  games: TrackedGame[];
  customizations: BarCustomizations;
}

export function EvalBarGrid({ games, customizations }: EvalBarGridProps) {
  return (
    <div className="eval-bars-container">
      <div className="eval-bars-grid" style={{ gap: `${customizations.barGap}px` }}>
        {games.map((game) => (
          <EvalBar key={game.key} game={game} customizations={customizations} />
        ))}
      </div>
    </div>
  );
}

export default EvalBarGrid;

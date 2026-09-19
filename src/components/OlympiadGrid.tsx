import { TrackedGame } from "../types";
import OlympiadCard, { CARD_GAP, CARD_W } from "./OlympiadCard";

/** A team match is four boards; missing ones show as placeholders. */
export const BOARDS_PER_MATCH = 4;

/** Exact authored width of the strip, used to size it to the window. */
export const STRIP_W = CARD_W * BOARDS_PER_MATCH + CARD_GAP * (BOARDS_PER_MATCH - 1);

interface OlympiadGridProps {
  games: TrackedGame[];
  team?: string;
  freezeClocks?: boolean;
}

/**
 * The four board cards in one row. Every slot is rendered here — a game or a
 * placeholder — so the strip is always exactly the same width.
 */
export function OlympiadGrid({ games, team, freezeClocks }: OlympiadGridProps) {
  return (
    <div className="oly-grid" style={{ gap: CARD_GAP }}>
      {Array.from({ length: BOARDS_PER_MATCH }, (_, index) => (
        <OlympiadCard
          key={games[index]?.key ?? `empty-${index}`}
          game={games[index]}
          board={index + 1}
          team={team}
          freezeClocks={freezeClocks}
        />
      ))}
    </div>
  );
}

export default OlympiadGrid;

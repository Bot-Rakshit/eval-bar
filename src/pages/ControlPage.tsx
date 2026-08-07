import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  BarCustomizations,
  DEFAULT_CUSTOMIZATIONS,
  GameSnapshot,
  RoundInfo,
  SelectionMode,
} from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useRoundMonitor } from "../hooks/useRoundMonitor";
import { useTrackedGames } from "../hooks/useTrackedGames";
import { encodeShareState } from "../lib/shareState";
import { getStockfishEngine } from "../lib/stockfishEngine";
import TournamentsList, { TournamentSelection } from "../components/TournamentsList";
import CustomizePanel from "../components/CustomizePanel";
import EvalBarGrid from "../components/EvalBarGrid";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#E79D29" },
  },
});

const EXAMPLE_SNAPSHOT: GameSnapshot = {
  key: "Example Player 1 - Example Player 2",
  whitePlayer: "Example Player 1",
  blackPlayer: "Example Player 2",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  whiteClock: 3600,
  blackClock: 3600,
  turn: "white",
  moveNumber: 1,
  result: null,
};
const EXAMPLE_SNAPSHOTS = new Map<string, GameSnapshot>([[EXAMPLE_SNAPSHOT.key, EXAMPLE_SNAPSHOT]]);
const EMPTY_SNAPSHOTS = new Map<string, GameSnapshot>();

export default function ControlPage() {
  const [tournament, setTournament] = useState<TournamentSelection | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("games");
  const [followedPlayer, setFollowedPlayer] = useState("");
  const [followAll, setFollowAll] = useState(false);
  const [manualKeys, setManualKeys] = useState<string[]>([]);
  const [chipSelection, setChipSelection] = useState<string[]>([]);
  const [showExample, setShowExample] = useState(false);
  const [customizations, setCustomizations] = useState<BarCustomizations>({ ...DEFAULT_CUSTOMIZATIONS });
  const navigate = useNavigate();

  useEffect(() => {
    void getStockfishEngine().init();
  }, []);

  const { snapshots: streamSnapshots } = useRoundStream(tournament?.roundId ?? null);
  const snapshots =
    showExample && !tournament ? EXAMPLE_SNAPSHOTS : tournament ? streamSnapshots : EMPTY_SNAPSHOTS;

  const players = useMemo(() => {
    const names = new Set<string>();
    for (const snapshot of snapshots.values()) {
      names.add(snapshot.whitePlayer);
      names.add(snapshot.blackPlayer);
    }
    return Array.from(names).sort();
  }, [snapshots]);

  const followModeActive = selectionMode === "player" && (followedPlayer !== "" || followAll);

  const selectedKeys = useMemo((): string[] | null => {
    if (showExample && !tournament) return [EXAMPLE_SNAPSHOT.key];
    if (selectionMode === "player") {
      if (followAll) return null;
      if (!followedPlayer) return [];
      const key = Array.from(snapshots.keys()).find(
        (candidate) =>
          candidate.startsWith(`${followedPlayer} - `) || candidate.endsWith(` - ${followedPlayer}`)
      );
      return key ? [key] : [];
    }
    return manualKeys;
  }, [showExample, tournament, selectionMode, followAll, followedPlayer, snapshots, manualKeys]);

  const { games, triggerDemoBlunder } = useTrackedGames(snapshots, selectedKeys);

  const handleRoundAdvance = useCallback((nextRound: RoundInfo) => {
    setTournament((current) =>
      current ? { tournamentId: current.tournamentId, roundId: nextRound.id } : current
    );
    setChipSelection([]);
  }, []);

  useRoundMonitor(
    tournament && followModeActive ? tournament.tournamentId : null,
    tournament?.roundId ?? null,
    handleRoundAdvance
  );

  const handleTournamentSelect = (selection: TournamentSelection) => {
    setTournament(selection);
    setShowExample(false);
    setSelectionMode("games");
    setFollowedPlayer("");
    setFollowAll(false);
    setManualKeys([]);
    setChipSelection([]);
  };

  const toggleChip = (key: string) => {
    setChipSelection((previous) =>
      previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key]
    );
  };

  const addSelectedGames = () => {
    setManualKeys((previous) => [
      ...previous,
      ...chipSelection.filter((key) => !previous.includes(key)),
    ]);
    setChipSelection([]);
  };

  const removeGame = (key: string) => {
    setManualKeys((previous) => previous.filter((k) => k !== key));
  };

  const resetTournament = () => {
    setTournament(null);
    setSelectionMode("games");
    setFollowedPlayer("");
    setFollowAll(false);
    setManualKeys([]);
    setChipSelection([]);
  };

  const handleGenerateLink = () => {
    if (!tournament) return;
    const encoded = encodeShareState({
      version: 2,
      tournamentId: tournament.tournamentId,
      roundId: tournament.roundId,
      customizations,
    });
    navigate(`/broadcast/${encoded}`);
    navigator.clipboard
      .writeText(`${window.location.origin}/broadcast/${encoded}`)
      .then(() => alert("Link copied to clipboard!"))
      .catch(() => {});
  };

  const availableGameKeys = Array.from(snapshots.keys());

  return (
    <ThemeProvider theme={theme}>
      <div className="page-shell">
        <header className="app-header">
          <span className="app-wordmark">
            EVAL<span className="app-wordmark-accent">BAR</span>
          </span>
          <span className="app-sub">ChessBase India Broadcast Tool</span>
        </header>

        {!tournament ? (
          <>
            <TournamentsList onSelect={handleTournamentSelect} />
            <div className="control-panel">
              <span className="control-label">Preview & theme</span>
              <div className="control-actions control-actions-flush">
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setShowExample((value) => !value)}
                >
                  {showExample ? "Remove Example Bar" : "Add Example Bar"}
                </button>
                <CustomizePanel customizations={customizations} onChange={setCustomizations} />
              </div>
            </div>
          </>
        ) : (
          <div className="control-panel">
            <div className="control-section">
              <span className="control-label">Selection mode</span>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={selectionMode === "games" ? "mode-btn active" : "mode-btn"}
                  onClick={() => setSelectionMode("games")}
                >
                  Select Games
                </button>
                <button
                  type="button"
                  className={selectionMode === "player" ? "mode-btn active" : "mode-btn"}
                  onClick={() => setSelectionMode("player")}
                >
                  Follow Player
                </button>
              </div>
            </div>

            {selectionMode === "player" ? (
              <div className="control-section">
                <span className="control-label">Follow</span>
                <Autocomplete
                  className="follow-input"
                  freeSolo
                  options={players}
                  value={followedPlayer}
                  onInputChange={(_, newValue) => setFollowedPlayer(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Follow a player"
                      variant="outlined"
                      size="small"
                      placeholder="Search or type a player name"
                    />
                  )}
                />
                <div className="follow-row">
                  <button
                    type="button"
                    className={followAll ? "action-btn primary" : "action-btn"}
                    onClick={() => {
                      setFollowAll((value) => !value);
                      if (!followAll) setFollowedPlayer("");
                    }}
                  >
                    Follow All Games
                  </button>
                  {followedPlayer && !followAll && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setFollowedPlayer("")}
                    >
                      Stop Following
                    </button>
                  )}
                  {followAll && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setFollowAll(false)}
                    >
                      Stop Following All
                    </button>
                  )}
                  {followModeActive && games.length === 0 && (
                    <span className="follow-hint">
                      Waiting for {followAll ? "the next round's games" : `${followedPlayer}'s game`} to
                      appear...
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="control-section">
                <span className="control-label">Games in this round</span>
                {availableGameKeys.length > 0 ? (
                  <div className="game-chip-grid">
                    {availableGameKeys.map((key) => {
                      const isTracked = manualKeys.includes(key);
                      const isSelected = chipSelection.includes(key);
                      const className = isTracked
                        ? "game-chip tracked"
                        : isSelected
                        ? "game-chip selected"
                        : "game-chip";
                      return (
                        <button
                          type="button"
                          key={key}
                          className={className}
                          onClick={() => (isTracked ? removeGame(key) : toggleChip(key))}
                        >
                          {key}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="control-empty">
                    No games available yet — waiting for the round to start.
                  </p>
                )}
              </div>
            )}

            <div className="control-actions">
              {selectionMode === "games" && (
                <button type="button" className="action-btn primary" onClick={addSelectedGames}>
                  Add Selected Games
                </button>
              )}
              <button type="button" className="action-btn primary" onClick={handleGenerateLink}>
                Create Unique Link
              </button>
              <button type="button" className="action-btn" onClick={triggerDemoBlunder}>
                Demo Blunder
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={resetTournament}
              >
                Change Tournament
              </button>
              <CustomizePanel customizations={customizations} onChange={setCustomizations} />
            </div>
          </div>
        )}

        <EvalBarGrid games={games} customizations={customizations} />
      </div>
    </ThemeProvider>
  );
}

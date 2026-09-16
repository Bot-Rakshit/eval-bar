import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { BarCustomizations, GameSnapshot, RoundInfo, SelectionMode } from "../types";
import { useRoundStream } from "../hooks/useRoundStream";
import { useRoundMonitor } from "../hooks/useRoundMonitor";
import { useTrackedGames } from "../hooks/useTrackedGames";
import { encodeShareState } from "../lib/shareState";
import { loadStoredCustomizations, storeCustomizations } from "../lib/storage";
import { getStockfishEngine } from "../lib/stockfishEngine";
import { fetchTournamentRounds } from "../api/lichess";
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
  whiteTeam: "",
  blackTeam: "",
  board: 0,
};
const EXAMPLE_SNAPSHOTS = new Map<string, GameSnapshot>([[EXAMPLE_SNAPSHOT.key, EXAMPLE_SNAPSHOT]]);
const EMPTY_SNAPSHOTS = new Map<string, GameSnapshot>();

const MODE_LABELS: Array<{ mode: SelectionMode; label: string }> = [
  { mode: "all", label: "All Games" },
  { mode: "games", label: "Select Games" },
  { mode: "player", label: "Follow Players" },
];

export default function ControlPage() {
  const [tournament, setTournament] = useState<TournamentSelection | null>(null);
  const [roundName, setRoundName] = useState("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("games");
  const [followedPlayers, setFollowedPlayers] = useState<string[]>([]);
  const [manualKeys, setManualKeys] = useState<string[]>([]);
  const [chipSelection, setChipSelection] = useState<string[]>([]);
  const [showExample, setShowExample] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [customizations, setCustomizations] = useState<BarCustomizations>(loadStoredCustomizations);
  const navigate = useNavigate();

  useEffect(() => {
    void getStockfishEngine().init();
  }, []);

  useEffect(() => {
    storeCustomizations(customizations);
  }, [customizations]);

  // Resolve the human-readable round name for the status row
  useEffect(() => {
    if (!tournament) {
      setRoundName("");
      return;
    }
    let cancelled = false;
    fetchTournamentRounds(tournament.tournamentId)
      .then((rounds) => {
        if (cancelled) return;
        const round = rounds.find((r) => r.id === tournament.roundId);
        setRoundName(round?.name ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tournament]);

  const { snapshots: streamSnapshots, mode: streamMode } = useRoundStream(
    tournament?.roundId ?? null
  );
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

  const selectedKeys = useMemo((): string[] | null => {
    if (showExample && !tournament) return [EXAMPLE_SNAPSHOT.key];
    if (selectionMode === "all") return null;
    if (selectionMode === "player") {
      if (followedPlayers.length === 0) return [];
      return Array.from(snapshots.keys()).filter((key) =>
        followedPlayers.some(
          (player) => key.startsWith(`${player} - `) || key.endsWith(` - ${player}`)
        )
      );
    }
    return manualKeys;
  }, [showExample, tournament, selectionMode, followedPlayers, snapshots, manualKeys]);

  const { games, triggerDemoBlunder } = useTrackedGames(snapshots, selectedKeys);

  // Auto-advance rounds unless the user pinned specific games
  const autoAdvanceActive =
    tournament !== null &&
    (selectionMode === "all" || (selectionMode === "player" && followedPlayers.length > 0));

  const handleRoundAdvance = useCallback((nextRound: RoundInfo) => {
    setTournament((current) => (current ? { ...current, roundId: nextRound.id } : current));
    setChipSelection([]);
    setManualKeys([]);
  }, []);

  useRoundMonitor(
    autoAdvanceActive && tournament ? tournament.tournamentId : null,
    tournament?.roundId ?? null,
    handleRoundAdvance
  );

  const handleTournamentSelect = (selection: TournamentSelection) => {
    setTournament(selection);
    setShowExample(false);
    setSelectionMode("games");
    setFollowedPlayers([]);
    setManualKeys([]);
    setChipSelection([]);
  };

  const resetTournament = () => {
    setTournament(null);
    setSelectionMode("games");
    setFollowedPlayers([]);
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

  // The link carries players rather than exact pairings so the broadcast view
  // keeps showing the right boards after a round advance (colors may flip).
  const linkPlayers = useMemo((): string[] => {
    if (selectionMode === "player") return followedPlayers;
    if (selectionMode === "games") {
      const names = new Set<string>();
      for (const key of manualKeys) {
        const [white, black] = key.split(" - ");
        if (white) names.add(white);
        if (black) names.add(black);
      }
      return Array.from(names);
    }
    return [];
  }, [selectionMode, followedPlayers, manualKeys]);

  const broadcastPath = tournament
    ? `/broadcast/${encodeShareState({
        version: 2,
        tournamentId: tournament.tournamentId,
        roundId: tournament.roundId,
        customizations,
        players: linkPlayers.length > 0 ? linkPlayers : undefined,
      })}`
    : null;

  const copyBroadcastLink = () => {
    if (!broadcastPath) return;
    navigator.clipboard
      .writeText(`${window.location.origin}${broadcastPath}`)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      })
      .catch(() => alert("Could not copy — copy the URL from the browser after opening the view."));
  };

  const openBroadcastView = () => {
    if (broadcastPath) navigate(broadcastPath);
  };

  const availableGameKeys = Array.from(snapshots.keys());
  const streamStatusLabel =
    streamMode === "stream" ? "Live" : streamMode === "poll" ? "Polling" : "Connecting…";

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
            <div className="status-row">
              <span className={`status-dot ${streamMode === "stream" ? "live" : ""}`} />
              <span className="status-text">
                <strong>{tournament.tournamentName ?? "Custom broadcast"}</strong>
                {roundName ? ` — ${roundName}` : ""} · {games.length}{" "}
                {games.length === 1 ? "game" : "games"} · {streamStatusLabel}
              </span>
              <button type="button" className="action-btn status-change-btn" onClick={resetTournament}>
                Change Tournament
              </button>
            </div>

            <div className="control-section">
              <span className="control-label">Games to show</span>
              <div className="mode-toggle">
                {MODE_LABELS.map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    className={selectionMode === mode ? "mode-btn active" : "mode-btn"}
                    onClick={() => setSelectionMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectionMode === "all" && (
                <p className="control-hint">
                  Every board in the round, and the next round starts automatically.
                </p>
              )}
              {selectionMode === "games" && (
                <p className="control-hint">
                  Hand-picked boards — the broadcast view follows these players into new rounds.
                </p>
              )}
              {selectionMode === "player" && (
                <p className="control-hint">
                  Follows the selected players into every new round automatically.
                </p>
              )}
            </div>

            {selectionMode === "player" && (
              <div className="control-section">
                <span className="control-label">Players</span>
                <Autocomplete
                  className="follow-input"
                  multiple
                  freeSolo
                  options={players}
                  value={followedPlayers}
                  onChange={(_, value) => setFollowedPlayers(value as string[])}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Follow players"
                      variant="outlined"
                      size="small"
                      placeholder="Search or type player names"
                    />
                  )}
                />
                {followedPlayers.length > 0 && games.length === 0 && (
                  <div className="follow-row">
                    <span className="follow-hint">Waiting for their games to appear…</span>
                  </div>
                )}
              </div>
            )}

            {selectionMode === "games" && (
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
              <button type="button" className="action-btn primary" onClick={copyBroadcastLink}>
                {linkCopied ? "Copied!" : "Copy Broadcast Link"}
              </button>
              <button type="button" className="action-btn" onClick={openBroadcastView}>
                Open Broadcast View
              </button>
              <button type="button" className="action-btn" onClick={triggerDemoBlunder}>
                Demo Blunder
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

import React, { useState, useRef, useEffect } from "react";
import { Toolbar, Button, Container, Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { EvalBar, TournamentsList, CustomizeEvalBar } from "../../components"; // Assuming these components are correctly pathed
import "./App.css";
import { useParams, useNavigate } from "react-router-dom";
import { makeFen } from 'chessops/fen';
import { PgnParser, startingPosition, walk } from 'chessops/pgn';
import { parseSan } from 'chessops/san';

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "transparent",
    },
    primary: {
      main: "#00008b",
    },
    secondary: {
      main: "#b9bbce",
    },
    tertiary: {
      main: "#ADD8E6",
    },
  },
  fontFamily: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(","),
});

const GameCard = ({ game, onClick, isSelected }) => {
  const variant = isSelected ? "contained" : "outlined";
  const color = isSelected ? "tertiary" : "secondary";
  const boxShadow = isSelected
    ? "0px 0px 12px 2px rgba(252,188,213,0.6)"
    : "none";

  const buttonStyle = {
    margin: "2px",
    padding: "6px",
    fontSize: "0.8em",
    fontWeight: "bold",
    boxShadow,
  };

  return (
    <Button
      variant={variant}
      color={color}
      style={buttonStyle}
      onClick={onClick}
    >
      {game}
    </Button>
  );
};

// --- START: Caching Implementation ---
const MAX_CACHE_SIZE = 100; // Max number of FENs to cache
const fenEvalCache = new Map(); // Using a Map for easier LRU-like behavior if needed

const getCachedEval = (fen) => {
  if (fenEvalCache.has(fen)) {
    // Move accessed item to the end to mark it as recently used (for potential LRU)
    const value = fenEvalCache.get(fen);
    fenEvalCache.delete(fen);
    fenEvalCache.set(fen, value);
    return value;
  }
  return null;
};

const setCachedEval = (fen, evalData) => {
  if (fenEvalCache.size >= MAX_CACHE_SIZE) {
    // Evict the least recently used item (first item in Map iteration order)
    const oldestKey = fenEvalCache.keys().next().value;
    fenEvalCache.delete(oldestKey);
  }
  fenEvalCache.set(fen, evalData);
};
// --- END: Caching Implementation ---

function App() {
  const [broadcastIDs, setBroadcastIDs] = useState([]);
  const [isBroadcastLoaded, setIsBroadcastLoaded] = useState(false);
  const [links, setLinks] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [selectedGames, setSelectedGames] = useState([]);
  const [blunderAlertLinks, setBlunderAlertLinks] = useState([]);
  const [customStyles, setCustomStyles] = useState({
    evalContainerBg: "#000000",
    blackBarColor: "#E79D29",
    whiteBarColor: "#ffffff",
    whitePlayerColor: "Transparent",
    blackPlayerColor: "Transparent",
    whitePlayerNameColor: "#FFFFFF",
    blackPlayerNameColor: "#E79D29",
    evalContainerBorderColor: "#FFFFFF",
  });

  const [layout, setLayout] = useState("grid"); // Consider if this state is still needed
  const [isChromaBackground, setIsChromaBackground] = useState(true);

  const allGames = useRef("");
  const abortControllers = useRef({});

  const { stateData } = useParams();
  const navigate = useNavigate();

  const [isBroadcastMode, setIsBroadcastMode] = useState(false);

  const [isGameDataLoaded, setIsGameDataLoaded] = useState(false);
  const [lastBlunderTime, setLastBlunderTime] = useState(0);
  const blunderCooldown = 10000; // 10 seconds cooldown between blunders

  const handleBlunder = (linkIndex) => {
    const currentTime = Date.now();
    if (!isGameDataLoaded || currentTime - lastBlunderTime < blunderCooldown) {
      return;
    }

    setBlunderAlertLinks((prevLinks) => [...prevLinks, linkIndex]);
    setLastBlunderTime(currentTime);

    setTimeout(() => {
      setBlunderAlertLinks((prevLinks) =>
        prevLinks.filter((index) => index !== linkIndex)
      );
    }, 10000);
  };

  const handleDemoBlunder = () => {
    if (links.length > 0) {
      const randomLinkIndex = Math.floor(Math.random() * links.length);
      handleBlunder(randomLinkIndex);
    }
  };

  // --- START: Updated fetchEvaluation function ---
  const fetchEvaluation = async (fen) => {
    const cachedData = getCachedEval(fen);
    if (cachedData) {
      console.log("Using cached eval for FEN:", fen);
      return cachedData;
    }

    console.log("Fetching new eval for FEN:", fen);
    // const endpoint = `https://stockfish.bmsamay.com/analyze_stockfish`; // Old endpoint
    const endpoint = `https://chess-api.com/v1`; // New endpoint

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Adjust the body according to the new API's requirements
        body: JSON.stringify({
          fen: fen,
          variants: 1, // Default as per API docs
          depth: 16,   // Default as per API docs, adjust if needed
          // maxThinkingTime: 50 // Optional: as per API docs
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Network response was not ok:", response.status, errorBody);
        throw new Error(`Network response was not ok: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      // Adapt the response to the structure your application expects
      // The new API returns an array of results, we'll take the first one
      // or the one that matches the input FEN if multiple are somehow returned.
      // For a single FEN request, it usually returns a single object or the first element of an array.
      // Let's assume the primary evaluation is in data or data[0] if it's an array.
      const primaryEval = Array.isArray(data) ? data[0] : data;

      if (!primaryEval || typeof primaryEval.eval === 'undefined') {
        console.error("Unexpected API response structure:", data);
        throw new Error("Unexpected API response structure");
      }

      const evalResult = {
        evaluation: primaryEval.eval,      // 'eval' from the new API
        bestMove: primaryEval.move,        // 'move' from the new API
        // Add other fields if your EvalBar component uses them, e.g., continuation
        // continuation: primaryEval.continuationArr ? primaryEval.continuationArr.join(' ') : undefined,
        // mate: primaryEval.mate, // if the API provides mate info and you use it
      };
      setCachedEval(fen, evalResult); // Cache the new result
      return evalResult;

    } catch (error) {
      console.error("Error fetching evaluation:", error);
      // Return a structure that doesn't break the app, or re-throw
      return {
        evaluation: null, // Or some default error indicator
        bestMove: null,
        error: error.message,
      };
    }
  };
  // --- END: Updated fetchEvaluation function ---


  const handleRemoveLink = (index) => {
    setLinks((prevLinks) => prevLinks.filter((link, i) => i !== index));
  };

  const handleTournamentSelection = async (selectedTournament) => {
    console.log("Received Tournament Data:", selectedTournament);
    setIsBroadcastLoaded(true);
    setIsChromaBackground(true);

    if (selectedTournament && selectedTournament.roundId) {
      setBroadcastIDs([selectedTournament.roundId]);
      setLinks([]);
      startStreaming(selectedTournament.roundId);
    } else {
      console.error("No valid tournament or round selected");
    }
  };

  const startStreaming = async (roundId) => {
    if (!roundId) {
      console.error("No roundId provided for streaming");
      return;
    }

    if (abortControllers.current[roundId]) {
      abortControllers.current[roundId].abort();
    }
    abortControllers.current[roundId] = new AbortController();

    const streamURL = `https://lichess.org/api/stream/broadcast/round/${roundId}.pgn`;
    try {
      const response = await fetch(streamURL, {
        signal: abortControllers.current[roundId].signal,
      });
      console.log("Stream URL:", streamURL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      if (isChromaBackground) { // Only add if true, though it's set true above
          document.body.classList.add("chroma-background");
      }


      const processStream = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) return;

          const newData = new TextDecoder().decode(value);
          allGames.current += newData;
          await updateEvaluations(); // This might be too frequent, consider debouncing or queueing
          fetchAvailableGames();
          setTimeout(processStream, 10); // Be cautious with such a short timeout for stream processing + eval updates
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error("Error processing stream:", error);
          }
        }
      };
      processStream();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error starting stream:", error);
      }
    }
  };

  const fetchAvailableGames = () => {
    const games = allGames.current.split("\n\n\n");
    const gameOptions = games
      .map((game) => {
        const whiteMatch = game.match(/\[White "(.*?)"\]/);
        const blackMatch = game.match(/\[Black "(.*?)"\]/);
        return whiteMatch && blackMatch
          ? `${whiteMatch[1]} - ${blackMatch[1]}`
          : null;
      })
      .filter(Boolean);
    setAvailableGames(Array.from(new Set(gameOptions)));
  };

  const handleGameSelection = (game) => {
    if (selectedGames.includes(game)) {
      setSelectedGames((prevGames) => prevGames.filter((g) => g !== game));
    } else {
      setSelectedGames((prevGames) => [...prevGames, game]);
    }
  };

  const addSelectedGames = () => {
    for (let game of selectedGames) {
      const [whitePlayer, blackPlayer] = game.split(" - ");
      if (
        !links.some(
          (link) =>
            link.whitePlayer === whitePlayer && link.blackPlayer === blackPlayer
        )
      ) {
        const newLink = {
          evaluation: null,
          whitePlayer,
          blackPlayer,
          error: null,
          lastFEN: "",
          whiteTime: 0,
          blackTime: 0,
          turn: "",
          moveNumber: 0,
          result: null, // Ensure result is initialized
        };
        setLinks((prevLinks) => [
          ...prevLinks,
          newLink,
        ]);
        // Initial update for the newly added game
        updateEvaluationsForLink(newLink).then(updatedLinkData => {
            if (updatedLinkData && updatedLinkData.lastFEN) {
                 setLinks(prevLinks => prevLinks.map(l =>
                    l.whitePlayer === updatedLinkData.whitePlayer && l.blackPlayer === updatedLinkData.blackPlayer ? { ...l, ...updatedLinkData } : l
                ));
            }
        });
      }
    }
    setSelectedGames([]);
  };

  const convertClockToSeconds = (clock) => {
    if (!clock || typeof clock !== 'string') return 0;
    const time = clock.split(":");
    if (time.length !== 3) return 0;
    const hours = Number(time[0]);
    const minutes = Number(time[1]);
    const seconds = Number(time[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
  };

  const updateEvaluationsForLink = async (link) => {
    const games = allGames.current.split("\n\n\n");
    const specificGamePgn = games.slice().reverse().find((game) => { // Use slice() to avoid mutating original if reverse modifies in place
      const whiteNameMatch = game.match(/\[White "(.*?)"\]/);
      const blackNameMatch = game.match(/\[Black "(.*?)"\]/);
      return (
        whiteNameMatch &&
        blackNameMatch &&
        `${whiteNameMatch[1]} - ${blackNameMatch[1]}` ===
        `${link.whitePlayer} - ${link.blackPlayer}`
      );
    });

    if (specificGamePgn) {
      let clocks = specificGamePgn.match(/\[%clk (.*?)\]/g);
      let clocksList = clocks ? clocks.map(clock => clock.match(/\[%clk (.*?)\]/)[1]) : [];


      let gameResult = null;
      const resultMatch = specificGamePgn.match(/\s(1-0|0-1|1\/2-1\/2)$/); // Added \s to ensure it's at the end of the line/game
      if (resultMatch) {
        gameResult = resultMatch[1] === "1/2-1/2" ? "Draw" : resultMatch[1];
      }

      try {
        let game = null;
        const parser = new PgnParser((parsedGame) => {
          game = parsedGame;
        });

        parser.parse(specificGamePgn);

        if (game) {
          let finalPosition = null;
          let finalFen = null;

          const setup = startingPosition(game.headers);
          if (setup.isOk()) {
            let pos = setup.value;
             walk(game.moves, pos, (currentPos, node) => {
              const move = parseSan(currentPos, node.san);
              if (move) {
                currentPos.play(move);
                finalPosition = currentPos; // Keep updating finalPosition to the latest
                return true;
              }
              console.warn("Could not parse SAN:", node.san, "on FEN:", makeFen(currentPos.toSetup()));
              return false; // Skip invalid move
            });
            if (!finalPosition && game.moves.length === 0) { // if no moves, use starting position
                finalPosition = pos;
            }
             if (finalPosition) {
               finalFen = makeFen(finalPosition.toSetup());
             }
          } else {
            console.error("Error creating starting position:", setup.error);
          }


          if (finalFen && finalFen !== link.lastFEN) {
            const evalData = await fetchEvaluation(finalFen); // This now uses the new API and caching

            if (evalData && typeof evalData.evaluation !== 'undefined') {
              let whiteTime = 0, blackTime = 0, turn = "";
              if (clocksList.length > 0) { // Process clocks even with one entry
                  const lastClockIndex = clocksList.length -1;
                  // The PGN move list determines whose turn it is after the last move.
                  // Chessops' finalPosition.turn() should give 'w' or 'b'.
                  turn = finalPosition.turn() === 'w' ? "white" : "black";

                  // Heuristic for clock times:
                  // If it's white's turn, the last clock entry was black's time after their move.
                  // If it's black's turn, the last clock entry was white's time after their move.
                  if (clocksList.length === 1) { // Only one clock entry
                      if (turn === "white") { // White to move, so black just moved. clock is black's time.
                          blackTime = convertClockToSeconds(clocksList[0]);
                          // White's time might be from a header or needs to be inferred/approximated
                      } else { // Black to move, so white just moved. clock is white's time.
                          whiteTime = convertClockToSeconds(clocksList[0]);
                      }
                  } else if (clocksList.length >= 2) {
                      // More robustly, we need to see how many moves were made.
                      // The PGN spec for %clk is after the move.
                      // Example: 1. e4 {[%clk 0:10:00]} e5 {[%clk 0:09:58]}
                      // After white's move e4, white's clock is 0:10:00. After black's e5, black's clock is 0:09:58.
                      // The number of clock entries usually corresponds to the number of half-moves.
                      const numHalfMoves = finalPosition.fullmoves() * 2 - (finalPosition.turn() === 'w' ? 2 : 1);

                      if (clocksList.length > numHalfMoves -1 && numHalfMoves -1 >=0 ) whiteTime = convertClockToSeconds(clocksList[numHalfMoves-1]);
                      if (clocksList.length > numHalfMoves && numHalfMoves >=0) blackTime = convertClockToSeconds(clocksList[numHalfMoves]);

                      // Simpler approach if the above is complex:
                      // Assume clocksList has pairs, or the last one is for the player who just moved.
                      if (turn === "white") { // White to move, so black just moved.
                          blackTime = convertClockToSeconds(clocksList[clocksList.length-1]); // Last clock is black's
                          if (clocksList.length > 1) whiteTime = convertClockToSeconds(clocksList[clocksList.length-2]); // Previous is white's
                      } else { // Black to move, so white just moved.
                          whiteTime = convertClockToSeconds(clocksList[clocksList.length-1]); // Last clock is white's
                          if (clocksList.length > 1) blackTime = convertClockToSeconds(clocksList[clocksList.length-2]); // Previous is black's
                      }
                  }
              } else if (finalPosition) { // If no clocks, still try to determine turn
                turn = finalPosition.turn() === 'w' ? "white" : "black";
              }


              const moveNumber = finalPosition ? finalPosition.fullmoves() : 0;

              return {
                ...link,
                evaluation: evalData.evaluation,
                // bestMove: evalData.bestMove, // If you want to display the best move from engine
                lastFEN: finalFen,
                result: gameResult,
                whiteTime,
                blackTime,
                turn,
                moveNumber,
                error: evalData.error || null, // Pass along any error from fetchEvaluation
              };
            } else {
                 console.warn("EvalData received was not valid for FEN:", finalFen, evalData);
                 return { ...link, error: "Invalid evaluation data", lastFEN: finalFen, result: gameResult }; // Keep FEN updated
            }
          } else if (finalFen === link.lastFEN && link.result !== gameResult) {
            // Only result changed, not the position
            return { ...link, result: gameResult };
          }
        }
      } catch (error) {
        console.error("Error processing game PGN:", specificGamePgn, error);
        return { ...link, error: "PGN processing error", result: gameResult }; // Keep result updated if possible
      }
    }
    // If no update was made (e.g., game not found, or no new FEN), return the original link
    return link;
  };

  const updateEvaluations = async () => {
    console.log("Updating evaluations for links:", links.length);
    if (!links.length) return;

    // Create a new array of promises for updating each link
    const updatePromises = links.map(async (link) => {
      try {
        const updatedLinkData = await updateEvaluationsForLink(link);
        // Important: Check if the updatedLinkData is materially different or has new info
        // to avoid unnecessary state updates.
        if (updatedLinkData && (updatedLinkData.lastFEN !== link.lastFEN || updatedLinkData.evaluation !== link.evaluation || updatedLinkData.result !== link.result)) {
          return updatedLinkData;
        }
        return link; // Return original if no significant change
      } catch (error) {
        console.error("Error updating evaluation for link:", link.whitePlayer, "-", link.blackPlayer, error);
        return { ...link, error: "Update failed" }; // Return link with error
      }
    });

    const updatedLinksArray = await Promise.all(updatePromises);

    // Update the state once with all changes
    setLinks(currentLinks => {
        // Create a map for quick lookups of new data
        const updatesMap = new Map(updatedLinksArray.map(ul => [`${ul.whitePlayer}-${ul.blackPlayer}`, ul]));
        const newLinks = currentLinks.map(cl => {
            const key = `${cl.whitePlayer}-${cl.blackPlayer}`;
            const updatedData = updatesMap.get(key);
            if (updatedData) {
                // Blunder check logic (can be refined)
                if (isGameDataLoaded && cl.evaluation !== null && updatedData.evaluation !== null && Math.abs(updatedData.evaluation - cl.evaluation) > 2) {
                    const linkIndex = currentLinks.findIndex(l => l.whitePlayer === cl.whitePlayer && l.blackPlayer === cl.blackPlayer);
                    if (linkIndex !== -1) {
                        handleBlunder(linkIndex); // Ensure handleBlunder uses the correct index from `currentLinks`
                    }
                }
                return { ...cl, ...updatedData }; // Merge with existing data to preserve any other state
            }
            return cl;
        });
        return newLinks;
    });
  };


  const handleGenerateLink = () => {
    const stateToSerialize = {
      broadcastIDs: broadcastIDs,
      // Storing game identifiers that can be used to re-select games later.
      // The FENs and evaluations will be re-fetched.
      gameSelections: links.map(link => `${link.whitePlayer} - ${link.blackPlayer}`),
      customStyles,
    };

    const serializedData = btoa(JSON.stringify(stateToSerialize));
    const uniqueLink = `/broadcast/${serializedData}`;

    navigate(uniqueLink);

    navigator.clipboard.writeText(`${window.location.origin}${uniqueLink}`)
      .then(() => {
        alert("Link copied to clipboard!");
        // Optionally, re-start streaming if this action implies a new session.
        // However, streaming should already be active if broadcastIDs are set.
        broadcastIDs.forEach(id => {
          if (!abortControllers.current[id]) { // Or if you want to ensure it's running
            startStreaming(id);
          }
        });
      })
      .catch((err) => console.error("Failed to copy link:", err));
  };

  useEffect(() => {
    let intervalId;
    if (links.length > 0 && (isBroadcastMode || isBroadcastLoaded)) { // Only run interval if there are links and we are in a mode that needs updates
      updateEvaluations(); // Initial update
      intervalId = setInterval(() => {
        updateEvaluations();
      }, 5000); // Increased interval to 5 seconds to be less aggressive
    }
    return () => clearInterval(intervalId);
  }, [links, isBroadcastMode, isBroadcastLoaded]); // Add dependencies

  useEffect(() => {
    // Initial load from query params (e.g., manual URL entry with tournamentId)
    const queryParams = new URLSearchParams(window.location.search);
    const tournamentIdFromQuery = queryParams.get("tournamentId");

    if (tournamentIdFromQuery && !isBroadcastLoaded && !stateData) { // Ensure it doesn't override stateData loading
        // This is a simplified way to handle it. You might want a more robust
        // way to represent a tournament if it's just an ID string.
        handleTournamentSelection({ roundId: tournamentIdFromQuery });
    }
  }, []); // Runs once on mount

  useEffect(() => {
    if (stateData) {
      setIsBroadcastMode(true);
      document.body.classList.add("chroma-background"); // Apply chroma if in broadcast mode from link

      try {
        const decodedData = JSON.parse(atob(stateData));
        console.log("Decoded state data from URL:", decodedData);

        setCustomStyles(prevStyles => ({ ...prevStyles, ...decodedData.customStyles }));
        setBroadcastIDs(decodedData.broadcastIDs || []);

        setIsBroadcastLoaded(true);

        if (Array.isArray(decodedData.gameSelections)) {
          const initialLinks = decodedData.gameSelections.map(gameSelection => {
            const [whitePlayer, blackPlayer] = gameSelection.split(" - ");
            return {
              whitePlayer,
              blackPlayer,
              evaluation: null,
              lastFEN: "",
              result: null,
              whiteTime: 0,
              blackTime: 0,
              turn: "",
              moveNumber: 0,
              error: null,
            };
          });
          setLinks(initialLinks);
          console.log("Initialized links from URL state:", initialLinks);
        } else {
          console.warn("gameSelections is not an array or missing in decoded data:", decodedData.gameSelections);
          setLinks([]);
        }

        // Abort any existing streams before starting new ones
        Object.values(abortControllers.current).forEach(controller => controller.abort());
        abortControllers.current = {};

        if (decodedData.broadcastIDs && decodedData.broadcastIDs.length > 0) {
          console.log("Starting streams for broadcast IDs from URL state:", decodedData.broadcastIDs);
          decodedData.broadcastIDs.forEach(id => startStreaming(id));
        } else {
          console.warn("No broadcast IDs found in URL state");
        }
      } catch (error) {
        console.error("Error parsing state from URL", error);
        // Potentially navigate to a safe/home page or show an error message
        navigate("/"); // Example: redirect to home on error
      }
    }
  }, [stateData, navigate]); // Add navigate to dependencies


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGameDataLoaded(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container
        maxWidth="xl"
        className={isChromaBackground ? "chroma-background" : "dark-background"}
        style={{ paddingTop: "20px", paddingBottom: "20px" }} // Added some padding
      >
        {!isBroadcastMode && (
          <>
            <Toolbar>
              <Box
                style={{ display: "flex", justifyContent: "center", flexGrow: 1 }}
              >
                <img
                  src="https://i.imgur.com/z2fbMtT.png" // Ensure this image is accessible
                  alt="ChessBase India Logo"
                  style={{ height: "80px", marginTop: "10px", marginBottom: "10px" }} // Adjusted style
                />
              </Box>
            </Toolbar>
            {isBroadcastLoaded ? (
              <Box
                mt={2} // Reduced margin top
                px={2} // Reduced padding
                sx={{
                  backgroundColor: "rgba(40, 40, 60, 0.8)", // Slightly adjusted color
                  padding: 2,
                  borderRadius: 2,
                  marginBottom: 2,
                  boxShadow: "0px 0px 10px rgba(0,0,0,0.5)", // Added some shadow
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {availableGames.map((game, index) => (
                    <GameCard
                        key={index}
                        game={game}
                        onClick={() => handleGameSelection(game)}
                        isSelected={selectedGames.includes(game)}
                    />
                    ))}
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginTop: "10px", marginRight: "10px" }}
                  onClick={addSelectedGames}
                  disabled={selectedGames.length === 0} // Disable if no games selected
                >
                  Add Selected Games Bar
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginTop: "10px", marginRight: "10px" }}
                  onClick={handleGenerateLink}
                  disabled={links.length === 0 && broadcastIDs.length === 0} // Disable if nothing to link
                >
                  Create Unique Link
                </Button>
                <Button
                  variant="outlined" // Changed for less emphasis
                  color="secondary"
                  style={{ marginTop: "10px" }}
                  onClick={handleDemoBlunder}
                  disabled={links.length === 0} // Disable if no links for demo
                >
                  Demo Blunder
                </Button>
                <CustomizeEvalBar
                  customStyles={customStyles}
                  setCustomStyles={setCustomStyles}
                />
              </Box>
            ) : (
              <div className="full-width" style={{ textAlign: 'center', marginTop: '20px' }}>
                <TournamentsList onSelect={handleTournamentSelection} />
              </div>
            )}
          </>
        )}

        <Box
          mt={isBroadcastMode ? 2 : 4} // Adjust margin based on mode
          px={isBroadcastMode ? 1 : 3} // Adjust padding
          className="eval-bars-container"
          style={{ width: "100%" }}
        >
          <Box
            display="flex"
            flexWrap="wrap"
            justifyContent="center" // Center bars
            gap="16px" // Add gap between bars
            width="100%"
          >
            {links.map((link, index) => (
              <EvalBar
                key={`${link.whitePlayer}-${link.blackPlayer}-${index}`} // More robust key
                evaluation={link.evaluation}
                whitePlayer={link.whitePlayer}
                blackPlayer={link.blackPlayer}
                result={link.result}
                // layout={layout} // If layout is still used by EvalBar
                lastFEN={link.lastFEN}
                customStyles={customStyles}
                alert={blunderAlertLinks.includes(index)}
                // onBlunder={() => handleBlunder(index)} // Blunder is now handled in updateEvaluations
                whiteTime={link.whiteTime}
                blackTime={link.blackTime}
                turn={link.turn}
                moveNumber={link.moveNumber}
                error={link.error} // Pass error to EvalBar if it can display it
                // onRemove={() => handleRemoveLink(index)} // Optional: if you want a remove button on each bar
              />
            ))}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;

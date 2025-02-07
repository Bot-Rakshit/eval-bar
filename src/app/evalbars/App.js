import React, { useState, useRef, useEffect } from "react";
import { Toolbar, Button, Container, Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { load_fen } from "../../app/evalbars/oldchess.js";
import { EvalBar, TournamentsList, CustomizeEvalBar } from "../../components";
import "./App.css";
import { useParams, useNavigate } from "react-router-dom";

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

// Modify the TEST_PGN constant to be in a cleaner format
const TEST_PGN = `[Event "Freestyle Chess Grand Slam Tour Round Robin"]
[Site "Weissenhaus, Germany"]
[Date "2025.02.07"]
[Round "3.2"]
[White "Aronian, Levon"]
[Black "Gukesh D"]
[Result "1/2-1/2"]
[SetUp "1"]
[FEN "rkbqrnnb/pppppppp/8/8/8/8/PPPPPPPP/RKBQRNNB w KQkq - 0 1"]
[Variant "Chess960"]

1. e4 e5 2. g3 d6 3. d3 g6 4. a4 a5 5. Ne2 Bd7 6. f4 Ne6 7. Ne3 Ne7 8. fxe5 dxe5 9. Rf1 Rf8 10. Nd5 f5 1/2-1/2`;

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

  const [layout, setLayout] = useState("grid");
  const [isChromaBackground, setIsChromaBackground] = useState(true);

  const allGames = useRef("");
  const abortControllers = useRef({});

  const { stateData } = useParams();
  const navigate = useNavigate();

  const [isBroadcastMode, setIsBroadcastMode] = useState(false);

  const [isGameDataLoaded, setIsGameDataLoaded] = useState(false);
  const [lastBlunderTime, setLastBlunderTime] = useState(0);
  const blunderCooldown = 10000; // 10 seconds cooldown between blunders

  const [testMoveNumber, setTestMoveNumber] = useState(5); // Add this state

  const handleBlunder = (linkIndex) => {
    const currentTime = Date.now();
    if (!isGameDataLoaded || currentTime - lastBlunderTime < blunderCooldown) {
      return; // Don't trigger blunder if game data isn't loaded or we're in cooldown
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

  const fetchEvaluation = async (fen) => {
    const endpoint = `https://stockfish.bmsamay.com/analyze_stockfish`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fen }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    return {
      evaluation: data.evaluation,
      bestMove: data.best_move,
      // Note: This API doesn't provide mate, ponder, or continuation information
    };
  };

  const handleRemoveLink = (index) => {
    setLinks((prevLinks) => prevLinks.filter((link, i) => i !== index));
  };

  const handleTournamentSelection = async (selectedTournament) => {
    console.log("Received Tournament Data:", selectedTournament);
    setIsBroadcastLoaded(true);
    setIsChromaBackground(true);
    
    if (selectedTournament && selectedTournament.roundId) {
      setBroadcastIDs([selectedTournament.roundId]);
      
      // For custom URLs, we don't have initial game IDs, so we'll start with an empty array
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
      document.body.classList.add("chroma-background");

      const processStream = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) return;

          const newData = new TextDecoder().decode(value);
          allGames.current += newData;
          await updateEvaluations();
          fetchAvailableGames();
          setTimeout(processStream, 10);
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
        setLinks((prevLinks) => [
          ...prevLinks,
          {
            evaluation: null,
            whitePlayer,
            blackPlayer,
            error: null,
            lastFEN: "",
            whiteTime: 0,
            blackTime: 0,
            turn: "",
            moveNumber: 0,
          },
        ]);
        updateEvaluationsForLink({ whitePlayer, blackPlayer });
      }
    }
    setSelectedGames([]);
  };

  const updateEvaluationsForLink = async (link) => {
    const games = allGames.current.split("\n\n\n");
    const specificGamePgn = games.reverse().find((game) => {
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
      // Extract headers
      const headers = {};
      const headerRegex = /\[(.*?) "(.*?)"\]/g;
      let match;
      while ((match = headerRegex.exec(specificGamePgn)) !== null) {
        headers[match[1]] = match[2];
      }

      // Initialize board with load_fen using the FEN from the PGN
      let fen = headers["FEN"];
      if (!fen) {
        console.error("FEN not found in PGN");
        return link;
      }
      let board = load_fen(fen);

      // Extract moves from the PGN (handling variations and comments)
      const moveText = specificGamePgn.split("\n\n")[1];

      // Remove comments and variations
      const cleanMoveText = moveText
        .replace(/\{[^}]*\}/g, "")  // Remove comments
        .replace(/\([^)]*\)/g, ""); // Remove variations

      const moves = cleanMoveText
        .replace(/\d+\./g, '')        // Remove move numbers
        .replace(/1-0|0-1|1\/2-1\/2/, '')  // Remove game result
        .trim()
        .split(/\s+/)
        .filter(move => move !== ''); // Remove empty strings

      // Apply moves, checking for legality
      for (let move of moves) {
        move = board.c960_castling_converter(move);
        let reason = board.illegal(move);
        if (reason) {
          console.error(`Illegal move ${move}: ${reason}`);
          //  Handle illegal move (e.g., stop processing, show error)
          break; // Stop applying moves
        }
        board = board.move(move);
      }

      const currentFEN = board.fen();
      console.log('Generated FEN:', currentFEN);

      let gameResult = null;
      const resultMatch = specificGamePgn.match(/(1-0|0-1|1\/2-1\/2)$/);
      if (resultMatch) {
        gameResult = resultMatch[1];
        if (gameResult === "1/2-1/2") gameResult = "Draw";
      }

      if (currentFEN !== link.lastFEN || gameResult !== link.result) {
        console.log('Sending FEN for evaluation:', currentFEN);
        const evalData = await fetchEvaluation(currentFEN);
        return {
          ...link,
          evaluation: evalData.evaluation,
          lastFEN: currentFEN,
          result: gameResult,
          whiteTime: 0,
          blackTime: 0,
          turn: board.active === 1 ? 'white' : 'black',
          moveNumber: board.fullmove,
        };
      }
    }

    return link;
  };

  const updateEvaluations = async () => {
    console.log("Updating evaluations for links:", links);
    for (let link of links) {
      try {
        const updatedLink = await updateEvaluationsForLink(link);
        if (updatedLink && updatedLink.whitePlayer && updatedLink.blackPlayer) {
          setLinks(prevLinks => prevLinks.map(l => 
            l.whitePlayer === updatedLink.whitePlayer && l.blackPlayer === updatedLink.blackPlayer ? updatedLink : l
          ));

          // Check for blunder only if game data is loaded and we have a previous evaluation
          if (isGameDataLoaded && link.evaluation !== null && Math.abs(updatedLink.evaluation - link.evaluation) > 2) {
            handleBlunder(links.indexOf(link));
          }
        }
      } catch (error) {
        console.error("Error updating evaluation for link:", link, error);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const handleGenerateLink = () => {
    const stateData = {
      broadcastIDs: broadcastIDs,
      gameIDs: links.map(link => `${link.whitePlayer}-vs-${link.blackPlayer}`),
      customStyles,
    };

    const serializedData = btoa(JSON.stringify(stateData));
    const uniqueLink = `/broadcast/${serializedData}`;
    
    navigate(uniqueLink);
    
    // Copy to clipboard
    navigator.clipboard.writeText(`${window.location.origin}${uniqueLink}`)
      .then(() => {
        alert("Link copied to clipboard!");
        // Start streaming for each broadcast ID if not already streaming
        broadcastIDs.forEach(id => {
          if (!abortControllers.current[id]) {
            startStreaming(id);
          }
        });
      })
      .catch((err) => console.error("Failed to copy link:", err));
  };

  useEffect(() => {
    if (links.length) {
      const interval = setInterval(() => {
        updateEvaluations();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [links]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tournamentId = queryParams.get("tournamentId");

    if (tournamentId) {
      handleTournamentSelection([tournamentId]);
    }
  }, []);

  useEffect(() => {
    if (stateData) {
      setIsBroadcastMode(true);
      try {
        const decodedData = JSON.parse(atob(stateData));
        console.log("Decoded state data:", decodedData);
        setBroadcastIDs(decodedData.broadcastIDs);
        setCustomStyles(decodedData.customStyles);
        
        setIsBroadcastLoaded(true);
        
        // Initialize links based on gameIDs
        if (Array.isArray(decodedData.gameIDs)) {
          const initialLinks = decodedData.gameIDs.map(gameID => {
            const [whitePlayer, blackPlayer] = gameID.split("-vs-");
            return { whitePlayer, blackPlayer, evaluation: null, lastFEN: "", result: null };
          });
          setLinks(initialLinks);
          console.log("Initialized links:", initialLinks);
        } else {
          console.error("gameIDs is not an array:", decodedData.gameIDs);
          setLinks([]);
        }
        
        // Abort any existing streams
        Object.values(abortControllers.current).forEach(controller => controller.abort());
        abortControllers.current = {};

        // Start streaming for each broadcast ID
        if (decodedData.broadcastIDs.length > 0) {
          console.log("Starting streams for broadcast IDs:", decodedData.broadcastIDs);
          decodedData.broadcastIDs.forEach(id => startStreaming(id));
        } else {
          console.error("No broadcast IDs found");
        }

        // Set up an interval to periodically update evaluations
        const updateInterval = setInterval(() => {
          updateEvaluations();
        }, 20000); // Check every 5 seconds

        // Clean up function
        return () => {
          clearInterval(updateInterval);
          // Abort all ongoing fetch requests
          Object.values(abortControllers.current).forEach(controller => controller.abort());
        };
      } catch (error) {
        console.error("Error parsing state from URL", error);
      }
    }
  }, [stateData]);  // Add stateData as a dependency

  useEffect(() => {
    // Delay the start of blunder checking
    const timer = setTimeout(() => {
      setIsGameDataLoaded(true);
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, []);

  // Modify handleTestChess960 to use oldchess.js methods
  const handleTestChess960 = async () => {
    try {
      // Load initial position from FEN
      const fenMatch = TEST_PGN.match(/\[FEN "([^"]+)"\]/);
      if (!fenMatch) {
        console.error("FEN not found in TEST_PGN");
        return;
      }
      let board = load_fen(fenMatch[1]);

      // Extract moves from PGN (simplified approach)
      const moveText = TEST_PGN.split('\n\n')[1]; // Get the moves part

      const cleanMoveText = moveText
        .replace(/\{[^}]*\}/g, "")  // Remove comments
        .replace(/\([^)]*\)/g, ""); // Remove variations

      const moves = cleanMoveText
        .replace(/\d+\./g, '') // Remove move numbers
        .replace(/1\/2-1\/2$/, '')  // Remove result
        .trim()
        .split(/\s+/);

      // Apply moves up to the test move number
      for (let i = 0; i < Math.min(testMoveNumber * 2, moves.length); i++) {
        let move = moves[i];
        move = board.c960_castling_converter(move);
        if (board.illegal(move)) {
          console.error("Failed to apply move:", move);
          return;
        }
        board = board.move(move);
      }

      // Get FEN and evaluate
      const currentFEN = board.fen();
      console.log('Test FEN:', currentFEN);

      const evalData = await fetchEvaluation(currentFEN);

      // Add a test link
      setLinks(prevLinks => [...prevLinks, {
        evaluation: evalData.evaluation,
        whitePlayer: "Test White",
        blackPlayer: "Test Black",
        lastFEN: currentFEN,
        result: null,
        whiteTime: 0,
        blackTime: 0,
        turn: board.active === 1 ? 'white' : 'black',
        moveNumber: board.fullmove,
      }]);

    } catch (error) {
      console.error("Error testing Chess960:", error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container
        maxWidth="xl"
        className={isChromaBackground ? "chroma-background" : "dark-background"}
      >
        {!isBroadcastMode && (
          <>
            <Toolbar>
              <Box
                style={{ display: "flex", justifyContent: "center", flexGrow: 1.5 }}
              >
                <img
                  src="https://i.imgur.com/z2fbMtT.png"
                  alt="ChessBase India Logo"
                  style={{ height: "100px", marginTop: "20px" }}
                />
              </Box>
            </Toolbar>

            {/* Add the test controls here, outside the isBroadcastLoaded check */}
            <Box mt={2} display="flex" alignItems="center" gap={2} justifyContent="center">
              <input
                type="number"
                value={testMoveNumber}
                onChange={(e) => setTestMoveNumber(parseInt(e.target.value))}
                style={{
                  width: "60px",
                  padding: "8px",
                  marginRight: "10px",
                  backgroundColor: "#2f3542",
                  color: "white",
                  border: "1px solid #666",
                  borderRadius: "4px"
                }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleTestChess960}
              >
                Test Chess960 PGN
              </Button>
            </Box>

            {isBroadcastLoaded ? (
              <Box
                mt={4}
                px={3}
                sx={{
                  backgroundColor: "rgba(50, 67, 100, 1)",
                  padding: 2,
                  borderRadius: 2,
                  marginBottom: 2,
                }}
              >
                {availableGames.map((game, index) => (
                  <GameCard
                    key={index}
                    game={game}
                    onClick={() => handleGameSelection(game)}
                    isSelected={selectedGames.includes(game)}
                  />
                ))}
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginTop: "10px", marginRight: "10px" }}
                  onClick={addSelectedGames}
                >
                  Add Selected Games Bars
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  style={{ marginTop: "10px", marginRight: "10px" }}
                  onClick={handleDemoBlunder}
                >
                  Demo Blunder
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginTop: "10px" }}
                  onClick={handleGenerateLink}
                >
                  Create Unique Link
                </Button>
                <CustomizeEvalBar
                  customStyles={customStyles}
                  setCustomStyles={setCustomStyles}
                />
              </Box>
            ) : (
              <div className="full-width">
                <TournamentsList onSelect={handleTournamentSelection} />
              </div>
            )}
          </>
        )}

        <Box
          mt={7}
          px={5}
          className="eval-bars-container"
          style={{ width: "100%" }}
        >
          <Box
            display="flex"
            flexWrap="wrap"
            justifyContent="center"
            width="100%"
          >
            {links.map((link, index) => (
              <EvalBar
                key={index}
                evaluation={link.evaluation}
                whitePlayer={link.whitePlayer}
                blackPlayer={link.blackPlayer}
                result={link.result}
                layout={layout}
                lastFEN={link.lastFEN}
                customStyles={customStyles}
                alert={blunderAlertLinks.includes(index)}
                onBlunder={() => handleBlunder(index)}
                whiteTime={link.whiteTime}
                blackTime={link.blackTime}
                turn={link.turn}
                moveNumber={link.moveNumber}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;

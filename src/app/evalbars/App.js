import React, { useState, useRef, useEffect } from "react";
import { Toolbar, Button, Container, Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { EvalBar, TournamentsList, CustomizeEvalBar } from "../../components";
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
  // Encode the FEN string to be safely included in a URL
  const encodedFen = encodeURIComponent(fen);
  const endpoint = `https://eval.plc.hadron43.in/eval-bars/?fen=${encodedFen}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET', // Changed to GET as the new API uses URL parameters
      headers: {
        // 'Content-Type': 'application/json', // Not strictly necessary for a GET request without a body
        // You might need other headers depending on the API requirements, like an API key.
      },
      // body: JSON.stringify({ fen }), // Removed as FEN is now in the URL
    });

    if (!response.ok) {
      // Attempt to get more error information from the response if available
      let errorMessage = `Network response was not ok (status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
      } catch (e) {
        // If response is not JSON or another error occurs
        errorMessage += ` - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // The new API returns an object like {"evaluation": 7.04}
    // It does not provide 'bestMove'.
    return {
      evaluation: data.evaluation,
      bestMove: null, // Set to null or undefined as the new API doesn't provide it
      // Note: This API doesn't provide mate, ponder, continuation, or bestMove information
    };
  } catch (error) {
    console.error("Failed to fetch evaluation:", error);
    // Depending on how you want to handle errors, you might re-throw,
    // return a default/error object, or handle it directly.
    throw error; // Re-throwing the error to be caught by the caller
  }
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

  const convertClockToSeconds = (clock) => {
    const time = clock.split(":");
    const hours = Number(time[0]);
    const minutes = Number(time[1]);
    const seconds = Number(time[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
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
      let clocks = specificGamePgn.match(/\[%clk (.*?)\]/g);
      let clocksList = clocks ? clocks.map(clock => clock.split(" ")[1].split("]")[0]) : [];
      
      let gameResult = null;
      const resultMatch = specificGamePgn.match(/(1-0|0-1|1\/2-1\/2)$/);
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

          startingPosition(game.headers).unwrap(
            pos => {
              walk(game.moves, pos, (pos, node) => {
                const move = parseSan(pos, node.san);
                if (move) {
                  pos.play(move);
                  finalPosition = pos;
                  return true;
                }
                return false;
              });
              
              if (finalPosition) {
                finalFen = makeFen(finalPosition.toSetup());
              }
            },
            err => {
              console.error("Error processing position:", err);
            }
          );

          if (finalFen && finalFen !== link.lastFEN) {
            const evalData = await fetchEvaluation(finalFen);
            
            let whiteTime = 0, blackTime = 0, turn = "";
            if (clocksList.length >= 2) {
              if (clocksList.length % 2) {
                whiteTime = convertClockToSeconds(clocksList[clocksList.length-1]);
                blackTime = convertClockToSeconds(clocksList[clocksList.length-2]);
                turn = "black";
              } else {
                blackTime = convertClockToSeconds(clocksList[clocksList.length-1]);
                whiteTime = convertClockToSeconds(clocksList[clocksList.length-2]);
                turn = "white";
              }
            }

            const moveNumber = Math.floor(clocksList.length/2) + 1;

            return {
              ...link,
              evaluation: evalData.evaluation,
              lastFEN: finalFen,
              result: gameResult,
              whiteTime,
              blackTime,
              turn,
              moveNumber,
            };
          }
        }
      } catch (error) {
        console.error("Error processing game:", error);
      }
    }

    // If no update was made, return the original link
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
                  Add Selected Games Bar
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

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
    moveIndicatorArrowColor: "#FFA500",
  });

  const [layout, setLayout] = useState("grid");
  const [isChromaBackground, setIsChromaBackground] = useState(true);

  const allGames = useRef("");
  const abortControllers = useRef({});

  const { stateData } = useParams();
  const navigate = useNavigate();

  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [currentTournamentId, setCurrentTournamentId] = useState(null); // Added to store tournament ID
  const [isTransitioningRound, setIsTransitioningRound] = useState(false); // Added for auto-populating games after transition

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

    if (selectedTournament && selectedTournament.roundId && selectedTournament.tournamentId) {
      setCurrentTournamentId(selectedTournament.tournamentId); // Store tournamentId
      setBroadcastIDs([selectedTournament.roundId]); // This will become the currentRoundId

      // For custom URLs, we don't have initial game IDs, so we'll start with an empty array
      setLinks([]);

      // Stop any existing streams before starting a new one
      Object.values(abortControllers.current).forEach(controller => controller.abort());
      abortControllers.current = {};
      allGames.current = ""; // Reset game data

      startStreaming(selectedTournament.roundId);
    } else {
      console.error("No valid tournament, round, or tournamentId selected", selectedTournament);
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
    const roundApiURL = `https://lichess.org/api/broadcast/-/-/${roundId}`;

    document.body.classList.add("chroma-background");

    // Polling fallback using the round API (provides FEN directly)
    const startPolling = () => {
      console.log("Starting polling mode (45 second interval)");

      const pollData = async () => {
        if (abortControllers.current[roundId]?.signal?.aborted) {
          return;
        }

        try {
          const response = await fetch(roundApiURL, {
            signal: abortControllers.current[roundId].signal,
            headers: {
              'Accept': 'application/json'
            },
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.games && Array.isArray(data.games)) {
            // Update available games from the API response
            const gameOptions = data.games.map(game => game.name).filter(Boolean);
            setAvailableGames(Array.from(new Set(gameOptions)));

            // Update links with FEN data from the API
            setLinks(prevLinks => prevLinks.map(link => {
              const gameKey = `${link.whitePlayer} - ${link.blackPlayer}`;
              const matchingGame = data.games.find(g => g.name === gameKey);

              if (matchingGame && matchingGame.fen && matchingGame.fen !== link.lastFEN) {
                // Get clock times from players array
                let whiteTime = 0, blackTime = 0;
                if (matchingGame.players && matchingGame.players.length >= 2) {
                  whiteTime = matchingGame.players[0].clock ? Math.floor(matchingGame.players[0].clock / 1000) : 0;
                  blackTime = matchingGame.players[1].clock ? Math.floor(matchingGame.players[1].clock / 1000) : 0;
                }

                // Determine whose turn it is from FEN
                const fenParts = matchingGame.fen.split(' ');
                const turn = fenParts[1] === 'w' ? 'white' : 'black';

                // Parse result
                let result = null;
                if (matchingGame.status && matchingGame.status !== '*') {
                  result = matchingGame.status === '½-½' ? 'Draw' : matchingGame.status;
                }

                return {
                  ...link,
                  lastFEN: matchingGame.fen,
                  whiteTime,
                  blackTime,
                  turn,
                  result,
                };
              }
              return link;
            }));

            // Trigger evaluation updates for links with new FENs
            updateEvaluations();
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error("Polling error:", error);
          }
        }

        // Poll every 45 seconds
        if (!abortControllers.current[roundId]?.signal?.aborted) {
          setTimeout(pollData, 45000);
        }
      };

      pollData();
    };

    try {
      const response = await fetch(streamURL, {
        signal: abortControllers.current[roundId].signal,
      });
      console.log("Stream URL:", streamURL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if ReadableStream is properly supported
      if (!response.body || !response.body.getReader) {
        console.log("ReadableStream not supported, falling back to polling");
        startPolling();
        return;
      }

      const reader = response.body.getReader();

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
            console.error("Error processing stream, switching to polling:", error);
            startPolling();
          }
        }
      };

      processStream();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Streaming failed, switching to polling:", error);
        startPolling();
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

  const addExampleBar = () => {
    const exampleBars = [
      {
        evaluation: 0.5,
        whitePlayer: "Example Player 1",
        blackPlayer: "Example Player 2",
        error: null,
        lastFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        whiteTime: 3600,
        blackTime: 3600,
        turn: "white",
        moveNumber: 1,
        result: null,
      },
    ];

    exampleBars.forEach((bar) => {
      if (
        !links.some(
          (link) =>
            link.whitePlayer === bar.whitePlayer &&
            link.blackPlayer === bar.blackPlayer
        )
      ) {
        setLinks((prevLinks) => [...prevLinks, bar]);
      }
    });
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
                whiteTime = convertClockToSeconds(clocksList[clocksList.length - 1]);
                blackTime = convertClockToSeconds(clocksList[clocksList.length - 2]);
                turn = "black";
              } else {
                blackTime = convertClockToSeconds(clocksList[clocksList.length - 1]);
                whiteTime = convertClockToSeconds(clocksList[clocksList.length - 2]);
                turn = "white";
              }
            }

            const moveNumber = Math.floor(clocksList.length / 2) + 1;

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
    if (!currentTournamentId || broadcastIDs.length === 0) {
      alert("Cannot generate link: Tournament ID or Round ID is missing.");
      return;
    }
    const stateToSerialize = {
      tournamentId: currentTournamentId, // Add tournamentId
      roundId: broadcastIDs[0], // Assuming broadcastIDs[0] is the current roundId
      gameIDs: links.map(link => `${link.whitePlayer}-vs-${link.blackPlayer}`),
      customStyles,
    };

    const serializedData = btoa(JSON.stringify(stateToSerialize));
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
        console.log("Decoded state data from URL:", decodedData);

        if (!decodedData.tournamentId || !decodedData.roundId) {
          console.error("Error: tournamentId or roundId missing in URL stateData.", decodedData);
          // Potentially navigate to an error page or home
          navigate("/");
          return;
        }

        setCurrentTournamentId(decodedData.tournamentId);
        setBroadcastIDs([decodedData.roundId]); // Storing as an array for consistency, but effectively currentRoundId
        setCustomStyles(decodedData.customStyles || customStyles); // Fallback to default if not in URL

        setIsBroadcastLoaded(true);
        document.body.classList.add("chroma-background"); // Ensure background is set

        if (Array.isArray(decodedData.gameIDs)) {
          const initialLinks = decodedData.gameIDs.map(gameID => {
            const [whitePlayer, blackPlayer] = gameID.split("-vs-");
            return { whitePlayer, blackPlayer, evaluation: null, lastFEN: "", result: null, whiteTime: 0, blackTime: 0, turn: "", moveNumber: 0 };
          });
          setLinks(initialLinks);
        } else {
          setLinks([]);
        }

        Object.values(abortControllers.current).forEach(controller => controller.abort());
        abortControllers.current = {};
        allGames.current = ""; // Reset game data

        console.log(`Starting stream from URL data for tournament: ${decodedData.tournamentId}, round: ${decodedData.roundId}`);
        startStreaming(decodedData.roundId);

        // The automatic round checking interval will be set up in another useEffect
        // that depends on `isBroadcastMode`, `currentTournamentId`, and `broadcastIDs[0]` (currentRoundId)

      } catch (error) {
        console.error("Error parsing state from URL or initializing broadcast mode:", error);
        navigate("/"); // Navigate to home on error
      }
    }
  }, [stateData, navigate]); // Added navigate to dependency array

  // useEffect for automatic round transition
  useEffect(() => {
    if (isBroadcastMode && currentTournamentId && broadcastIDs.length > 0) {
      const currentRoundId = broadcastIDs[0];
      console.log(`Broadcast mode active. Monitoring tournament ${currentTournamentId}, round ${currentRoundId}`);

      const checkForNextRound = async () => {
        console.log(`Checking for next round for tournament: ${currentTournamentId}, current round: ${currentRoundId}`);
        try {
          // Use the specific tournament endpoint which is more reliable in OBS browser
          const res = await fetch(`https://lichess.org/api/broadcast/${currentTournamentId}`, {
            headers: {
              'Accept': 'application/json'
            }
          });
          if (!res.ok) {
            console.error("Failed to fetch broadcast data for round check", res.status);
            return;
          }
          const broadcastData = await res.json();

          // The specific tournament endpoint returns the tournament directly
          const tournamentData = broadcastData;

          if (!tournamentData || !tournamentData.rounds) {
            console.log(`Tournament ${currentTournamentId} not found or has no rounds in API response.`);
            // Tournament might have ended or data is temporarily unavailable.
            // Decide on behavior: stop trying, or keep trying? For now, just return.
            return;
          }

          const rounds = tournamentData.rounds;
          const currentRoundInApi = rounds.find(r => r.id === currentRoundId);

          if (currentRoundInApi && currentRoundInApi.ongoing) {
            // Current round is still ongoing, do nothing.
            console.log(`Round ${currentRoundId} is still ongoing.`);
            return;
          }

          // Current round is NOT ongoing or not found (implies it ended or data changed)
          console.log(`Round ${currentRoundId} is no longer ongoing (or not found). Searching for next round.`);
          let nextOngoingRound = null;
          const currentRoundIndex = rounds.findIndex(r => r.id === currentRoundId);

          // Look for the next round in sequence that is ongoing
          if (currentRoundIndex !== -1) {
            for (let i = currentRoundIndex + 1; i < rounds.length; i++) {
              if (rounds[i].ongoing) {
                nextOngoingRound = rounds[i];
                break;
              }
            }
          }

          // If not found sequentially, find any other ongoing round in this tournament
          if (!nextOngoingRound) {
            nextOngoingRound = rounds.find(r => r.id !== currentRoundId && r.ongoing);
          }

          if (nextOngoingRound) {
            console.log(`Found next ongoing round: ${nextOngoingRound.id} for tournament ${currentTournamentId}. Transitioning.`);
            // Stop current stream
            if (abortControllers.current[currentRoundId]) {
              abortControllers.current[currentRoundId].abort();
              delete abortControllers.current[currentRoundId];
            }
            allGames.current = ""; // Reset game data
            setLinks([]); // Clear old game links
            setSelectedGames([]); // Clear selected games from previous round
            setAvailableGames([]); // Clear available games from old round

            setIsTransitioningRound(true); // Signal that a transition is in progress

            // Update state to new round
            setBroadcastIDs([nextOngoingRound.id]);
            // `currentTournamentId` remains the same

            // Update the URL first
            // This part requires careful handling of stateData structure
            const newUrlState = {
              tournamentId: currentTournamentId,
              roundId: nextOngoingRound.id,
              gameIDs: [], // Start with no games selected for the new round
              customStyles: customStyles
            };
            const serializedNewState = btoa(JSON.stringify(newUrlState));
            navigate(`/broadcast/${serializedNewState}`, { replace: true });
            // {replace: true} avoids polluting browser history with intermediate round changes.

            // Start streaming for the new round AFTER URL and state are set
            // Note: The navigation might cause a re-render and effect re-runs.
            // `startStreaming` should ideally be robust to this or be called from an effect
            // that specifically handles the new roundId if `stateData` changes.
            // For now, direct call after navigate. If issues arise, this might need refinement.
            startStreaming(nextOngoingRound.id);

          } else {
            console.log(`No next ongoing round found for tournament ${currentTournamentId}.`);
            // Optional: Notify user tournament might have ended or no new round started.
          }
        } catch (error) {
          console.error("Error checking for next round:", error);
        }
      };

      const intervalId = setInterval(checkForNextRound, 30000); // Check every 30 seconds
      checkForNextRound(); // Initial check

      return () => {
        console.log("Cleaning up round check interval for tournament", currentTournamentId);
        clearInterval(intervalId);
      };
    }
  }, [isBroadcastMode, currentTournamentId, broadcastIDs, navigate, customStyles]); // Ensure all dependencies are listed

  // useEffect for auto-populating eval bars after a round transition
  useEffect(() => {
    if (isTransitioningRound && availableGames.length > 0) {
      console.log("Auto-populating eval bars for new round with games:", availableGames);
      const newLinks = availableGames.map(gameString => {
        const [whitePlayer, blackPlayer] = gameString.split(" - ");
        return {
          whitePlayer,
          blackPlayer,
          evaluation: null,
          lastFEN: "",
          result: null,
          whiteTime: 0,
          blackTime: 0,
          turn: "",
          moveNumber: 0
        };
      });
      setLinks(newLinks);
      setIsTransitioningRound(false); // Reset the flag
    }
  }, [availableGames, isTransitioningRound, setIsTransitioningRound, setLinks]);


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
              <>
                <div className="full-width">
                  <TournamentsList onSelect={handleTournamentSelection} />
                </div>
                <Box mt={4} px={3} textAlign="center">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={addExampleBar}
                    style={{ marginBottom: "20px" }}
                  >
                    Add Example Bar
                  </Button>
                  <CustomizeEvalBar
                    customStyles={customStyles}
                    setCustomStyles={setCustomStyles}
                  />
                </Box>
              </>
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

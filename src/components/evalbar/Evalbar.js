/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import "./EvalBar.css";
import blunderSound from "../../assets/blunder-sound.mp3";

function EvalBar({
  evaluation,
  whitePlayer,
  blackPlayer,
  result,
  layout,
  customStyles,
  alert,
  onBlunder,
  lastFEN,
  whiteTime,
  blackTime,
  turn,
  moveNumber,
}) {
  const prevEvaluationRef = useRef(null);
  const prevResultRef = useRef(undefined);
  const blunderSoundRef = useRef(null);
  const intervalRef = useRef(null);

  const [displayBlunder, setDisplayBlunder] = React.useState(false);
  const [timePassed,setTimePassed] = React.useState(0);

  const onBlunderFunction = () => {
    onBlunder();
    setDisplayBlunder(true);
    setTimeout(() => {
      setDisplayBlunder(false);
    }, 10000);
  };

  useEffect(() => {
    if (prevEvaluationRef.current !== null) {
      const prevEval = prevEvaluationRef.current;
      const currentEval = evaluation;

      const isBlunder = (prevEval, currentEval) => {
        if (prevEval >= -4 && prevEval <= 4) {
          if (Math.abs(currentEval - prevEval) >= 2) {
            return true;
          }
        }
        return false;
      };

      if (isBlunder(prevEval, currentEval)) {
        onBlunderFunction();
      }
    }
    prevEvaluationRef.current = evaluation;
  }, [evaluation, onBlunder]);

  useEffect(() => {
    if (
      prevResultRef.current !== undefined &&
      prevResultRef.current !== result &&
      result !== null
    ) {
      blunderSoundRef.current.volume = 0.8; // Set volume to 60%
      blunderSoundRef.current.play();
      onBlunder();
    }
    prevResultRef.current = result;
  }, [result, onBlunder]);

  // adjusts the time passed after the last move
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (turn !== "" && !result) {
      setTimePassed(0);
      intervalRef.current = setInterval(() => {
        setTimePassed(prevValue => prevValue+1);
      },1000);
    }
    return () => {clearInterval(intervalRef.current)}
  }, [turn, result]);

  const getBarSegment = (evalValue) => {
    return Math.min(Math.max(Math.round(evalValue), -5), +5);
  };

  const getWhiteBarWidth = () => {
    if (result === "1-0") return "100%";
    if (result === "0-1") return "0%";
    if (result === "1/2-1/2") return "50%";
    
    if (evaluation >= 99) return "100%";
    if (evaluation >= 4) return "90%";
    if (evaluation <= -4) return "10%";
    return `${50 + getBarSegment(evaluation) * 7.5}%`;
  };

  const getDisplayEvaluation = () => {
    if (result === "1-0") return 10.0;
    if (result === "0-1") return -10.0;
    if (result === "1/2-1/2") return 0.0;
    return evaluation;
  };

  const formatName = (name) => {
    // Remove commas and other unwanted characters
    const cleanedName = name.replace(/[,.;]/g, "").trim();
    const parts = cleanedName.split(" ").filter((part) => part.length > 0);

    // Special cases:
    if (parts.includes("Praggnanandhaa")) return "Pragg";
    if (parts.includes("Nepomniachtchi")) return "Nepo";
    if (parts.includes("Goryachkina")) return "Gorya";
    if (parts.includes("Gukesh")) return "Gukesh";

    // Find the shortest name with at least 3 letters
    let shortestName = parts[0] || "";
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].length >= 3 && parts[i].length < shortestName.length) {
        shortestName = parts[i];
      }
    }

    // If the shortest name is less than 3 letters, use the first name
    if (shortestName.length < 3) {
      shortestName = parts[0] || "";
    }

    // Increase the character limit to 10
    return shortestName.slice(0, 10);
  };

  const formatEvaluation = (evalValue) => {
    if (evalValue < -1000 || evalValue > 1000) {
      return "Checkmate";
    }
    return evalValue;
  };

  const convertSecondsToClock = (time) => {
    if (time < 1) {
      return "0:00:00" // handles out of bounds edge case
    }
    let timeLeft = time;
    const hours = Math.floor(timeLeft/3600);
    timeLeft = timeLeft%3600;
    const minutes = Math.floor(timeLeft/60);
    timeLeft = timeLeft%60;
    const seconds = timeLeft;
    return `${hours}:${minutes<10 ? 0 : ""}${minutes}:${seconds<10 ? 0 : ""}${seconds}`
  }

  const displayResult = result !== null ? result : formatEvaluation(getDisplayEvaluation());

  const evalDisplayClass = result !== null ? "result" : "evaluation-value";

  return (
    <Box
      className={`eval-container ${layout} ${alert ? "blink-border" : ""}`}
      style={{
        background: customStyles.evalContainerBg,
        border: `1px solid ${customStyles.evalContainerBorderColor}`,
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "2px", // Reduced from 4px
        height: "auto", // Allow the container to adjust its height based on content
      }}
    >
      <Box
        className="player-names"
        display="flex"
        justifyContent="space-between"
        style={{ marginBottom: "1px" }} // Add a small margin at the bottom
      >
        <Typography
          variant="h6"
          className="white-player"
          style={{
            background: customStyles.whitePlayerColor,
            color: customStyles.whitePlayerNameColor,
            fontSize: "1.1rem",
            padding: "2px 8px", // Reduced vertical padding
            maxWidth: "45%",
          }}
        >
          <b>{formatName(whitePlayer)}</b>
        </Typography>
        <Typography
          variant="h6"
          className="black-player"
          style={{
            background: customStyles.blackPlayerColor,
            color: customStyles.blackPlayerNameColor,
            fontSize: "1.1rem",
            padding: "2px 8px", // Reduced vertical padding
            maxWidth: "45%",
          }}
        >
          <b>{formatName(blackPlayer)}</b>
        </Typography>
      </Box>

      {/*clocks section*/}
      <Box
        className="player-names"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        style={{ marginBottom: "1px" }} // Add a small margin at the bottom
      >
        {/*clock's color turns red when the clock reaches 30 seconds otherwise if it stays as player name color*/}
        <Typography
          variant="h6"
          className="white-player"
          style={{
            background: customStyles.whitePlayerColor,
            color: (turn === "white" && whiteTime - timePassed <= 30) || whiteTime <= 30 ? "red" : customStyles.whitePlayerNameColor,
            fontSize: "0.8rem",
            padding: "2px 8px", // Reduced vertical padding
            maxWidth: "45%",
          }}
        >
          <b>
            {
              turn === "white" ?
              convertSecondsToClock(whiteTime-timePassed) :
              convertSecondsToClock(whiteTime)
            }
          </b>
        </Typography>
        {/*Left arrow (white turn indicator)*/}
        <div
          style={{
            border: "5px solid transparent",
            borderRight: "7px solid orange",
            borderLeftWidth: "0px",
            opacity: turn === "white" ? 1 : 0.5
          }}
        >
        </div>
        {/*Move number of player (current turn)*/}
        <Typography
          variant="h6"
          style={{
            background: customStyles.whitePlayerColor,
            color: "white",
            fontSize: "0.8rem",
            padding: "2px", // Reduced vertical padding
          }}
        >
          <b>{moveNumber}</b>
        </Typography>
        {/*Right arrow (black turn indicator)*/}
        <div
          style={{
            border: "5px solid transparent",
            borderLeft: "7px solid orange",
            borderRightWidth: "0px",
            opacity: turn === "black" ? 1 : 0.5
          }}
        >
        </div>
        <Typography
          variant="h6"
          className="black-player"
          style={{
            background: customStyles.blackPlayerColor,
            color: (turn === "black" && blackTime - timePassed <= 30) || blackTime <= 30 ? "red" : customStyles.blackPlayerNameColor,
            fontSize: "0.8rem",
            padding: "2px 8px", // Reduced vertical padding
            maxWidth: "45%",
          }}
        >
          <b>
            {
              turn === "black" ?
              convertSecondsToClock(blackTime-timePassed) :
              convertSecondsToClock(blackTime)
            }
          </b>
        </Typography>
      </Box>

      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          flexGrow: 1,
          minHeight: "30px", // Reduced from 40px
        }}
      >
        <Typography
          variant="h7"
          className={result !== null ? "result" : "evaluation-value"}
          style={{
            fontSize: "19px",
            color: result !== null ? "white" : "black",
            fontWeight: "bold",
            zIndex: 1,
            marginBottom: "2.5px", // Reduced from 2px
          }}
        >
          {result !== null ? result : formatEvaluation(getDisplayEvaluation())}
        </Typography>

        {result === null && (
          <Box
            className="eval-bars"
            style={{
              height: "18 px", // Slightly reduced from 20px
              width: "100%",
              borderRadius: "8px",
              background: customStyles.blackBarColor,
              overflow: "hidden",
              position: "relative",
              zIndex: 0,
            }}
          >
            <Box
              className="white-bar"
              style={{
                width: getWhiteBarWidth(),
                background: customStyles.whiteBarColor,
                height: "100%",
              }}
            ></Box>
            <Box className="zero-marker"></Box>
          </Box>
        )}
      </Box>

      <audio ref={blunderSoundRef} src={blunderSound} />

      {displayBlunder && (
        <div
          style={{
            borderRadius: "50%",
            padding: "0px",
            background: "red",
            position: "absolute",
            top: "0px",
            right: "0px",
            animation: "pulse 1.5s infinite",
            fontSize: "12px",
          }}
        >
          ??
        </div>
      )}
    </Box>
  );
}

// get the last move from FEN

function getLastMove(fen) {
  const parts = fen.split(" ");
  if (parts.length < 4) return null;
  return parts[parts.length - 1];
}

export default EvalBar;

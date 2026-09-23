import { PgnParser, startingPosition, walk } from "chessops/pgn";
import { parseSan } from "chessops/san";
import { makeFen } from "chessops/fen";
import { GameResult, GameSnapshot, makeGameKey } from "../types";
import { ApiRoundGame } from "../api/lichess";

export function clockTagToSeconds(clock: string): number {
  const [hours, minutes, seconds] = clock.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function readHeader(pgn: string, header: string): string | null {
  const match = pgn.match(new RegExp(`\\[${header} "(.*?)"\\]`));
  return match ? match[1] : null;
}

function parseResult(pgn: string): GameResult {
  const tailMatch = pgn.match(/(1-0|0-1|1\/2-1\/2)\s*$/);
  if (tailMatch) return tailMatch[1] as GameResult;
  const headerMatch = pgn.match(/\[Result\s+"(1-0|0-1|1\/2-1\/2)"\]/);
  return headerMatch ? (headerMatch[1] as GameResult) : null;
}

function finalFenFromPgn(pgn: string): string | null {
  let finalFen: string | null = null;
  const parser = new PgnParser((game) => {
    startingPosition(game.headers).unwrap(
      (pos) => {
        finalFen = makeFen(pos.toSetup());
        walk(game.moves, pos, (pos, node) => {
          const move = parseSan(pos, node.san);
          if (!move) return false;
          pos.play(move);
          finalFen = makeFen(pos.toSetup());
          return true;
        });
      },
      () => {
        finalFen = null;
      }
    );
  });

  try {
    parser.parse(pgn);
  } catch {
    return null;
  }
  return finalFen;
}

export function gameKeyFromPgn(pgn: string): string | null {
  const whitePlayer = readHeader(pgn, "White");
  const blackPlayer = readHeader(pgn, "Black");
  return whitePlayer && blackPlayer ? makeGameKey(whitePlayer, blackPlayer) : null;
}

export function parseSnapshotFromPgn(pgn: string): GameSnapshot | null {
  const whitePlayer = readHeader(pgn, "White");
  const blackPlayer = readHeader(pgn, "Black");
  if (!whitePlayer || !blackPlayer) return null;

  const clockTags = pgn.match(/\[%clk (.*?)\]/g) ?? [];
  const clocks = clockTags.map((tag) => clockTagToSeconds(tag.split(" ")[1].replace("]", "")));

  let whiteClock = 0;
  let blackClock = 0;
  let turn: GameSnapshot["turn"] = "";
  let moveNumber = 0;

  if (clocks.length >= 2) {
    if (clocks.length % 2 === 1) {
      whiteClock = clocks[clocks.length - 1];
      blackClock = clocks[clocks.length - 2];
      turn = "black";
    } else {
      blackClock = clocks[clocks.length - 1];
      whiteClock = clocks[clocks.length - 2];
      turn = "white";
    }
    moveNumber = Math.floor(clocks.length / 2) + 1;
  }

  const fen = finalFenFromPgn(pgn);
  if (!fen) return null;

  // Team events tag rounds as "<round>.<board>"
  const roundTag = readHeader(pgn, "Round") ?? "";
  const boardMatch = roundTag.match(/\.(\d+)$/);

  return {
    key: makeGameKey(whitePlayer, blackPlayer),
    whitePlayer,
    blackPlayer,
    fen,
    whiteClock,
    blackClock,
    turn,
    moveNumber,
    result: parseResult(pgn),
    whiteTeam: readHeader(pgn, "WhiteTeam") ?? "",
    blackTeam: readHeader(pgn, "BlackTeam") ?? "",
    board: boardMatch ? Number(boardMatch[1]) : 0,
    whiteElo: Number(readHeader(pgn, "WhiteElo")) || 0,
    blackElo: Number(readHeader(pgn, "BlackElo")) || 0,
  };
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function snapshotFromApiGame(game: ApiRoundGame, board = 0): GameSnapshot | null {
  if (!game.name) return null;
  const separator = game.name.indexOf(" - ");
  if (separator === -1) return null;

  const whitePlayer = game.name.slice(0, separator);
  const blackPlayer = game.name.slice(separator + 3);
  // Games that haven't started yet come with an empty FEN
  const fen = game.fen || START_FEN;
  const fenParts = fen.split(" ");

  let result: GameResult = null;
  if (game.status && game.status !== "*") {
    result = game.status === "½-½" ? "1/2-1/2" : (game.status as GameResult);
  }

  return {
    key: makeGameKey(whitePlayer, blackPlayer),
    whitePlayer,
    blackPlayer,
    fen,
    // Round API clocks are in centiseconds
    whiteClock: game.players?.[0]?.clock ? Math.floor(game.players[0].clock / 100) : 0,
    blackClock: game.players?.[1]?.clock ? Math.floor(game.players[1].clock / 100) : 0,
    turn: fenParts[1] === "w" ? "white" : "black",
    moveNumber: Number(fenParts[5]) || 0,
    result,
    whiteTeam: game.players?.[0]?.team ?? "",
    blackTeam: game.players?.[1]?.team ?? "",
    board,
    whiteElo: game.players?.[0]?.rating ?? 0,
    blackElo: game.players?.[1]?.rating ?? 0,
  };
}

export function snapshotsEqual(a: GameSnapshot, b: GameSnapshot): boolean {
  return (
    a.fen === b.fen &&
    a.whiteClock === b.whiteClock &&
    a.blackClock === b.blackClock &&
    a.turn === b.turn &&
    a.result === b.result
  );
}

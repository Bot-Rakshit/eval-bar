import { getSf19FallbackChain, selectSf19Variant } from "./sf19";

const MAX_DEPTH = 18;

export interface EvaluationResult {
  evaluation: number;
  depth: number;
  mateIn: number | null;
}

export type ProgressCallback = (result: EvaluationResult) => void;

interface EngineEvalData extends EvaluationResult {
  isFinal: boolean;
}

function hasSharedArrayBuffer(): boolean {
  return typeof SharedArrayBuffer !== "undefined";
}

function isValidFen(fen: string): boolean {
  if (!fen || typeof fen !== "string") return false;
  const parts = fen.trim().split(" ");
  if (parts.length < 4) return false;
  const ranks = parts[0].split("/");
  if (ranks.length !== 8) return false;
  for (const rank of ranks) {
    let squares = 0;
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        squares += parseInt(char, 10);
      } else if (/[pnbrqkPNBRQK]/.test(char)) {
        squares += 1;
      } else {
        return false;
      }
    }
    if (squares !== 8) return false;
  }
  return parts[1] === "w" || parts[1] === "b";
}

/** One runnable engine build, in the order init should try them. */
interface EngineBuild {
  label: string;
  scriptPath: string;
  /** Stockfish 18 ships as an ES module worker; the others are classic workers. */
  module: boolean;
  /** Value for `setoption name Threads`. */
  threads: number;
}

/**
 * Stockfish 19 first — its builds are self-contained classic workers that
 * resolve their own .wasm and carry the NNUE inside it, so there is no separate
 * net to fetch. The 18/17 builds stay on as a fallback.
 */
function engineCandidates(): EngineBuild[] {
  const builds: EngineBuild[] = [];

  const selection = selectSf19Variant();
  if (selection) {
    for (const candidate of getSf19FallbackChain(selection)) {
      builds.push({
        label: `Stockfish 19 (${candidate.variant})`,
        scriptPath: candidate.url,
        module: false,
        threads: candidate.maxThreads,
      });
    }
  }

  if (hasSharedArrayBuffer()) {
    builds.push({
      label: "Stockfish 18",
      scriptPath: "/engines/stockfish-18-worker.js",
      module: true,
      threads: 1,
    });
  }
  builds.push({
    label: "Stockfish 17.1",
    scriptPath: "/engines/stockfish-17-lite-single.js",
    module: false,
    threads: 1,
  });

  return builds;
}

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private isSearching = false;
  private currentFen: string | null = null;
  private onEvaluation: ((data: EngineEvalData) => void) | null = null;
  private initPromise: Promise<boolean> | null = null;
  private searchId = 0;
  /**
   * `go` commands sent, and `bestmove`s received, on the current worker.
   * SF19 queues `position`/`go` until the running search has answered
   * `bestmove`, so after a `stop` the old search still prints its last `info`
   * lines. Those belong to the previous board; an `info` line is only the
   * current search's once every earlier `go` has had its `bestmove`.
   */
  private goCount = 0;
  private bestmoveCount = 0;
  /** Builds that crashed after starting, so init moves on to the next one. */
  private failedBuilds = new Set<string>();
  private activeBuild: EngineBuild | null = null;
  /** The current search's latest score, finalised when its bestmove lands. */
  private lastEval: EngineEvalData | null = null;

  reset(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        /* ignore */
      }
    }
    this.worker = null;
    this.isReady = false;
    this.isSearching = false;
    this.currentFen = null;
    this.onEvaluation = null;
    this.initPromise = null;
    this.searchId = 0;
    this.goCount = 0;
    this.bestmoveCount = 0;
  }

  async init(): Promise<boolean> {
    if (this.isReady && this.worker) return true;
    if (this.initPromise) return this.initPromise;

    this.isReady = false;
    this.initPromise = (async () => {
      for (const build of engineCandidates().filter((candidate) => !this.failedBuilds.has(candidate.scriptPath))) {
        if (await this.tryInitEngine(build)) return true;
        console.log(`${build.label} failed to start, trying the next build`);
      }
      this.initPromise = null;
      return false;
    })();

    return this.initPromise;
  }

  private tryInitEngine(build: EngineBuild): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (this.worker) {
          try {
            this.worker.terminate();
          } catch {
            /* ignore */
          }
          this.worker = null;
          this.isReady = false;
        }

        this.worker = build.module
          ? new Worker(build.scriptPath, { type: "module" })
          : new Worker(build.scriptPath);
        const worker = this.worker;
        this.goCount = 0;
        this.bestmoveCount = 0;

        const timeout = setTimeout(() => {
          console.error(`${build.label} init timeout`);
          try {
            worker.terminate();
          } catch {
            /* ignore */
          }
          this.worker = null;
          this.isReady = false;
          resolve(false);
        }, 20000);

        worker.onmessage = (e: MessageEvent<string>) => {
          const text = e.data || "";

          if (text === "uciok") {
            try {
              worker.postMessage("isready");
            } catch {
              /* ignore */
            }
            return;
          }

          if (text === "readyok") {
            if (!this.isReady) {
              clearTimeout(timeout);
              this.isReady = true;
              try {
                worker.postMessage(`setoption name Threads value ${build.threads}`);
                worker.postMessage(`setoption name Hash value ${build.threads > 1 ? 32 : 16}`);
              } catch {
                /* ignore */
              }
              this.activeBuild = build;
              console.log(`${build.label} initialized`);
              resolve(true);
            }
            return;
          }

          if (text.startsWith("bestmove")) {
            this.bestmoveCount += 1;
            if (this.bestmoveCount >= this.goCount) {
              this.isSearching = false;
              // A search that ends short of MAX_DEPTH (mate on the board, a
              // forced line) is still finished — report it now rather than
              // leaving the caller to time out.
              const last = this.lastEval;
              this.lastEval = null;
              if (last && !last.isFinal && this.onEvaluation) {
                try {
                  this.onEvaluation({ ...last, isFinal: true });
                } catch (err) {
                  console.error("Evaluation callback error:", err);
                }
              }
            }
            return;
          }

          // Bound lines are aspiration-window guesses, not scores.
          const isCurrentSearch = this.bestmoveCount + 1 === this.goCount;
          if (
            text.startsWith("info ") &&
            this.onEvaluation &&
            isCurrentSearch &&
            !/\b(lowerbound|upperbound)\b/.test(text)
          ) {
            const depthMatch = text.match(/\bdepth\s+(\d+)/);
            const scoreMateMatch = text.match(/\bscore\s+mate\s+(-?\d+)/);
            const scoreCpMatch = text.match(/\bscore\s+cp\s+(-?\d+)/);

            if (depthMatch && (scoreMateMatch || scoreCpMatch)) {
              const depth = parseInt(depthMatch[1], 10);
              const isBlackToMove = this.currentFen?.split(" ")[1] === "b";

              let evaluation: number;
              let mateIn: number | null = null;

              if (scoreMateMatch) {
                const rawMate = parseInt(scoreMateMatch[1], 10);
                mateIn = isBlackToMove ? -rawMate : rawMate;
                evaluation = mateIn > 0 ? 100 : -100;
              } else {
                const cp = parseInt(scoreCpMatch![1], 10);
                evaluation = (isBlackToMove ? -cp : cp) / 100;
              }

              this.lastEval = { evaluation, depth, mateIn, isFinal: depth >= MAX_DEPTH };
              try {
                this.onEvaluation(this.lastEval);
              } catch (err) {
                console.error("Evaluation callback error:", err);
              }
            }
          }
        };

        worker.onerror = (e) => {
          console.error(`${build.label} worker error:`, e);
          clearTimeout(timeout);
          // A build that started and then died (a WASM trap, a pthread killed
          // under memory pressure) is not retried: the next init skips to the
          // next build in the chain.
          if (this.activeBuild === build) {
            this.failedBuilds.add(build.scriptPath);
            this.activeBuild = null;
          }
          this.isReady = false;
          this.isSearching = false;
          this.initPromise = null;
          try {
            worker.terminate();
          } catch {
            /* ignore */
          }
          this.worker = null;
          resolve(false);
        };

        worker.postMessage("uci");
      } catch (error) {
        console.error(`Failed to create ${build.label} worker:`, error);
        this.initPromise = null;
        resolve(false);
      }
    });
  }

  async evaluate(fen: string, onEvaluation: (data: EngineEvalData) => void): Promise<void> {
    if (!isValidFen(fen)) {
      console.warn("Invalid FEN rejected:", fen);
      return;
    }

    if (!this.isReady || !this.worker) {
      this.initPromise = null;
      const initialized = await this.init();
      if (!initialized) {
        console.error("Stockfish failed to initialize");
        return;
      }
    }

    const currentSearchId = ++this.searchId;
    this.currentFen = fen;

    this.onEvaluation = (data) => {
      if (this.searchId === currentSearchId) {
        onEvaluation(data);
      }
    };

    if (this.isSearching) {
      try {
        this.worker!.postMessage("stop");
      } catch (err) {
        console.error("Failed to stop search:", err);
        this.reset();
        return;
      }
      await new Promise((r) => setTimeout(r, 30));
    }

    try {
      this.isSearching = true;
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${MAX_DEPTH}`);
      this.goCount += 1;
      this.lastEval = null;
    } catch (err) {
      console.error("Failed to start search:", err);
      this.isSearching = false;
      this.reset();
    }
  }

  stop(): void {
    if (this.worker && this.isSearching) {
      try {
        this.worker.postMessage("stop");
      } catch {
        /* ignore */
      }
      this.isSearching = false;
    }
    this.onEvaluation = null;
  }

  terminate(): void {
    this.stop();
    if (this.worker) {
      try {
        this.worker.postMessage("quit");
      } catch {
        /* ignore */
      }
      const worker = this.worker;
      setTimeout(() => {
        try {
          worker.terminate();
        } catch {
          /* ignore */
        }
      }, 100);
      this.worker = null;
      this.isReady = false;
      this.initPromise = null;
    }
  }
}

let engineInstance: StockfishEngine | null = null;

interface QueueItem {
  fen: string;
  onProgress: ProgressCallback | null;
  resolve: (result: EvaluationResult | null) => void;
}

const evalQueue: QueueItem[] = [];
let isProcessingQueue = false;

export function getStockfishEngine(): StockfishEngine {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

async function doEvaluate(fen: string, onProgress: ProgressCallback | null): Promise<EvaluationResult | null> {
  const engine = getStockfishEngine();

  return new Promise((resolve) => {
    let latestEval: EngineEvalData | null = null;
    let resolved = false;

    const finish = (result: EvaluationResult | null) => {
      if (resolved) return;
      resolved = true;
      engine.stop();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish(
        latestEval
          ? { evaluation: latestEval.evaluation, depth: latestEval.depth, mateIn: latestEval.mateIn }
          : null
      );
    }, 8000);

    void engine.evaluate(fen, (evalData) => {
      latestEval = evalData;
      if (onProgress) {
        try {
          onProgress({ evaluation: evalData.evaluation, depth: evalData.depth, mateIn: evalData.mateIn });
        } catch (err) {
          console.error("Progress callback error:", err);
        }
      }
      if (evalData.isFinal) {
        clearTimeout(timeout);
        finish({ evaluation: evalData.evaluation, depth: evalData.depth, mateIn: evalData.mateIn });
      }
    });
  });
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue || evalQueue.length === 0) return;
  isProcessingQueue = true;

  while (evalQueue.length > 0) {
    const item = evalQueue.shift()!;
    try {
      item.resolve(await doEvaluate(item.fen, item.onProgress));
    } catch (err) {
      console.error("Evaluation error:", err);
      item.resolve(null);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  isProcessingQueue = false;
}

export function evaluateWithProgress(fen: string, onProgress: ProgressCallback | null): Promise<EvaluationResult | null> {
  return new Promise((resolve) => {
    evalQueue.push({ fen, onProgress, resolve });
    void processQueue();
  });
}

export function evaluatePosition(fen: string): Promise<EvaluationResult | null> {
  return evaluateWithProgress(fen, null);
}

export default StockfishEngine;

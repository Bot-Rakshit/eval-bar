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

type EngineVersion = "sf18" | "sf17";

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private isSearching = false;
  private currentFen: string | null = null;
  private onEvaluation: ((data: EngineEvalData) => void) | null = null;
  private initPromise: Promise<boolean> | null = null;
  private searchId = 0;

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
  }

  async init(): Promise<boolean> {
    if (this.isReady && this.worker) return true;
    if (this.initPromise) return this.initPromise;

    this.isReady = false;
    const preferSF18 = hasSharedArrayBuffer();

    this.initPromise = this.tryInitEngine(preferSF18 ? "sf18" : "sf17")
      .then((success) => {
        if (success) return true;
        if (preferSF18) {
          console.log("Stockfish 18 failed, falling back to Stockfish 17.1");
          return this.tryInitEngine("sf17");
        }
        return false;
      })
      .then((success) => {
        if (!success) this.initPromise = null;
        return success;
      });

    return this.initPromise;
  }

  private tryInitEngine(version: EngineVersion): Promise<boolean> {
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

        const isModule = version === "sf18";
        const scriptPath =
          version === "sf18" ? "/engines/stockfish-18-worker.js" : "/engines/stockfish-17-lite-single.js";

        this.worker = isModule
          ? new Worker(scriptPath, { type: "module" })
          : new Worker(scriptPath);
        const worker = this.worker;

        const timeout = setTimeout(() => {
          console.error(`Stockfish ${version} init timeout`);
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
                worker.postMessage("setoption name Threads value 1");
                worker.postMessage("setoption name Hash value 4");
              } catch {
                /* ignore */
              }
              console.log(`Stockfish ${version === "sf18" ? "18" : "17.1"} initialized`);
              resolve(true);
            }
            return;
          }

          if (text.startsWith("info ") && this.onEvaluation) {
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

              try {
                this.onEvaluation({ evaluation, depth, mateIn, isFinal: depth >= MAX_DEPTH });
              } catch (err) {
                console.error("Evaluation callback error:", err);
              }
            }
          }

          if (text.startsWith("bestmove ")) {
            this.isSearching = false;
          }
        };

        worker.onerror = (e) => {
          console.error(`Stockfish ${version} worker error:`, e);
          clearTimeout(timeout);
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
        console.error(`Failed to create stockfish ${version} worker:`, error);
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

// Stockfish WASM Engine Manager
// Uses Stockfish 17 Lite for client-side evaluation

const MAX_DEPTH = 18;

class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isSearching = false;
    this.currentFen = null;
    this.onEvaluation = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.isReady) {
      return true;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        this.worker = new Worker('/engines/stockfish-17-lite-single.js');

        const timeout = setTimeout(() => {
          console.error('Stockfish init timeout');
          resolve(false);
        }, 30000);

        this.worker.onmessage = (e) => {
          const text = e.data || '';

          if (text === 'uciok') {
            this.worker.postMessage('isready');
            return;
          }

          if (text === 'readyok') {
            if (!this.isReady) {
              clearTimeout(timeout);
              this.isReady = true;
              // Configure engine
              this.worker.postMessage('setoption name Threads value 1');
              this.worker.postMessage('setoption name Hash value 16');
              resolve(true);
            }
            return;
          }

          // Parse evaluation info
          if (text.startsWith('info ') && this.onEvaluation) {
            const depthMatch = text.match(/\bdepth\s+(\d+)/);
            const scoreMatMatch = text.match(/\bscore\s+mate\s+(-?\d+)/);
            const scoreCpMatch = text.match(/\bscore\s+cp\s+(-?\d+)/);

            if (depthMatch && (scoreMatMatch || scoreCpMatch)) {
              const depth = parseInt(depthMatch[1], 10);

              // Get current turn from FEN
              const isBlackToMove = this.currentFen && this.currentFen.split(' ')[1] === 'b';

              let evaluation;
              if (scoreMatMatch) {
                const mateIn = parseInt(scoreMatMatch[1], 10);
                // Flip for black's perspective and convert to large number
                const adjustedMate = isBlackToMove ? -mateIn : mateIn;
                evaluation = adjustedMate > 0 ? 100 : -100; // Use +/-100 for mate scores
              } else {
                const cp = parseInt(scoreCpMatch[1], 10);
                // Flip score if black to move (stockfish reports from side-to-move perspective)
                const adjustedCp = isBlackToMove ? -cp : cp;
                evaluation = adjustedCp / 100; // Convert centipawns to pawns
              }

              this.onEvaluation({
                evaluation,
                depth,
                isFinal: depth >= MAX_DEPTH
              });
            }
          }

          if (text.startsWith('bestmove ')) {
            this.isSearching = false;
          }
        };

        this.worker.onerror = (e) => {
          console.error('Stockfish worker error:', e);
          clearTimeout(timeout);
          this.isReady = false;
          resolve(false);
        };

        this.worker.postMessage('uci');
      } catch (error) {
        console.error('Failed to create stockfish worker:', error);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  async evaluate(fen, onEvaluation) {
    if (!this.isReady) {
      const initialized = await this.init();
      if (!initialized) {
        console.error('Stockfish failed to initialize');
        return null;
      }
    }

    this.currentFen = fen;
    this.onEvaluation = onEvaluation;

    // Stop any existing search
    if (this.isSearching) {
      this.worker.postMessage('stop');
      await new Promise(r => setTimeout(r, 50));
    }

    this.isSearching = true;
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${MAX_DEPTH}`);
  }

  stop() {
    if (this.worker && this.isSearching) {
      this.worker.postMessage('stop');
      this.isSearching = false;
    }
  }

  terminate() {
    if (this.worker) {
      this.worker.postMessage('quit');
      setTimeout(() => {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
      }, 100);
      this.isReady = false;
      this.isSearching = false;
    }
  }
}

// Singleton instance
let engineInstance = null;

export function getStockfishEngine() {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

export async function evaluatePosition(fen) {
  const engine = getStockfishEngine();

  return new Promise((resolve) => {
    let latestEval = null;

    engine.evaluate(fen, (evalData) => {
      latestEval = evalData;

      // Resolve once we hit max depth
      if (evalData.isFinal) {
        resolve({
          evaluation: evalData.evaluation,
          depth: evalData.depth
        });
      }
    });

    // Timeout fallback - return best available eval after 10 seconds
    setTimeout(() => {
      if (latestEval) {
        resolve({
          evaluation: latestEval.evaluation,
          depth: latestEval.depth
        });
      } else {
        resolve(null);
      }
    }, 10000);
  });
}

// For real-time updates during evaluation
export async function evaluateWithProgress(fen, onProgress) {
  const engine = getStockfishEngine();

  return new Promise((resolve) => {
    let latestEval = null;

    engine.evaluate(fen, (evalData) => {
      latestEval = evalData;

      // Call progress callback for each depth update
      if (onProgress) {
        onProgress({
          evaluation: evalData.evaluation,
          depth: evalData.depth
        });
      }

      // Resolve once we hit max depth
      if (evalData.isFinal) {
        resolve({
          evaluation: evalData.evaluation,
          depth: evalData.depth
        });
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (latestEval) {
        resolve({
          evaluation: latestEval.evaluation,
          depth: latestEval.depth
        });
      } else {
        resolve(null);
      }
    }, 15000);
  });
}

export default StockfishEngine;

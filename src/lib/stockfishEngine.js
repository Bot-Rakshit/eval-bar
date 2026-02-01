// Stockfish WASM Engine Manager
// Uses Stockfish 18 with Stockfish 17.1 as fallback

const MAX_DEPTH = 18;

/**
 * Check if SharedArrayBuffer is available (required for SF18)
 */
function hasSharedArrayBuffer() {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Validate FEN string to prevent WASM crashes
 */
function isValidFen(fen) {
  if (!fen || typeof fen !== 'string') return false;
  const parts = fen.trim().split(' ');
  if (parts.length < 4) return false;
  const ranks = parts[0].split('/');
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
  return parts[1] === 'w' || parts[1] === 'b';
}

class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isSearching = false;
    this.currentFen = null;
    this.onEvaluation = null;
    this.initPromise = null;
    this.engineVersion = null; // 'sf18' or 'sf17'
    this.searchId = 0; // Track current search to ignore stale callbacks
  }

  reset() {
    if (this.worker) {
      try { this.worker.terminate(); } catch {}
    }
    this.worker = null;
    this.isReady = false;
    this.isSearching = false;
    this.currentFen = null;
    this.onEvaluation = null;
    this.initPromise = null;
    this.engineVersion = null;
    this.searchId = 0;
  }

  async init() {
    // If already ready and worker exists, return true
    if (this.isReady && this.worker) {
      return true;
    }

    // If currently initializing, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Reset state before initializing
    this.isReady = false;
    
    // Try SF18 first if SharedArrayBuffer is available
    const preferSF18 = hasSharedArrayBuffer();
    
    this.initPromise = this.tryInitEngine(preferSF18 ? 'sf18' : 'sf17')
      .then(success => {
        if (success) return true;
        // Fallback to SF17 if SF18 failed
        if (preferSF18) {
          console.log('Stockfish 18 failed, falling back to Stockfish 17.1');
          return this.tryInitEngine('sf17');
        }
        return false;
      })
      .then(success => {
        // Clear initPromise on failure so retry is possible
        if (!success) {
          this.initPromise = null;
        }
        return success;
      });

    return this.initPromise;
  }

  async tryInitEngine(version) {
    return new Promise((resolve) => {
      try {
        // Terminate existing worker if any
        if (this.worker) {
          try { this.worker.terminate(); } catch {}
          this.worker = null;
          this.isReady = false;
        }

        const isModule = version === 'sf18';
        const scriptPath = version === 'sf18' 
          ? '/engines/stockfish-18-worker.js' 
          : '/engines/stockfish-17-lite-single.js';

        this.worker = isModule 
          ? new Worker(scriptPath, { type: 'module' })
          : new Worker(scriptPath);

        const timeout = setTimeout(() => {
          console.error(`Stockfish ${version} init timeout`);
          try { this.worker.terminate(); } catch {}
          this.worker = null;
          this.isReady = false;
          resolve(false);
        }, 20000);

        this.worker.onmessage = (e) => {
          const text = e.data || '';

          if (text === 'uciok') {
            try { this.worker.postMessage('isready'); } catch {}
            return;
          }

          if (text === 'readyok') {
            if (!this.isReady) {
              clearTimeout(timeout);
              this.isReady = true;
              this.engineVersion = version;
              // Configure engine with low memory settings
              try {
                this.worker.postMessage('setoption name Threads value 1');
                this.worker.postMessage('setoption name Hash value 4');
              } catch {}
              console.log(`Stockfish ${version === 'sf18' ? '18' : '17.1'} initialized`);
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
              let mateIn = null;

              if (scoreMatMatch) {
                const rawMate = parseInt(scoreMatMatch[1], 10);
                // Flip for black's perspective
                mateIn = isBlackToMove ? -rawMate : rawMate;
                // Use large values for sorting/bar display (positive = white winning)
                evaluation = mateIn > 0 ? 100 : -100;
              } else {
                const cp = parseInt(scoreCpMatch[1], 10);
                // Flip score if black to move (stockfish reports from side-to-move perspective)
                const adjustedCp = isBlackToMove ? -cp : cp;
                evaluation = adjustedCp / 100; // Convert centipawns to pawns
              }

              try {
                this.onEvaluation({
                  evaluation,
                  depth,
                  mateIn,
                  isFinal: depth >= MAX_DEPTH
                });
              } catch (err) {
                console.error('Evaluation callback error:', err);
              }
            }
          }

          if (text.startsWith('bestmove ')) {
            this.isSearching = false;
          }
        };

        this.worker.onerror = (e) => {
          console.error(`Stockfish ${version} worker error:`, e);
          clearTimeout(timeout);
          this.isReady = false;
          this.isSearching = false;
          this.initPromise = null; // Allow retry
          try { this.worker.terminate(); } catch {}
          this.worker = null;
          resolve(false);
        };

        this.worker.postMessage('uci');
      } catch (error) {
        console.error(`Failed to create stockfish ${version} worker:`, error);
        this.initPromise = null; // Allow retry
        resolve(false);
      }
    });
  }

  async evaluate(fen, onEvaluation) {
    // Validate FEN first
    if (!isValidFen(fen)) {
      console.warn('Invalid FEN rejected:', fen);
      return null;
    }

    // Check if engine is ready, try to reinitialize if not
    if (!this.isReady || !this.worker) {
      this.initPromise = null; // Clear stale promise
      const initialized = await this.init();
      if (!initialized) {
        console.error('Stockfish failed to initialize');
        return null;
      }
    }

    // Increment search ID to track this specific search
    const currentSearchId = ++this.searchId;
    this.currentFen = fen;
    
    // Wrap callback to check search ID
    this.onEvaluation = (data) => {
      if (this.searchId === currentSearchId && onEvaluation) {
        onEvaluation(data);
      }
    };

    // Stop any existing search
    if (this.isSearching) {
      try {
        this.worker.postMessage('stop');
      } catch (err) {
        console.error('Failed to stop search:', err);
        this.reset();
        return null;
      }
      await new Promise(r => setTimeout(r, 30));
    }

    try {
      this.isSearching = true;
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${MAX_DEPTH}`);
    } catch (err) {
      console.error('Failed to start search:', err);
      this.isSearching = false;
      this.reset();
      return null;
    }
  }

  stop() {
    if (this.worker && this.isSearching) {
      try {
        this.worker.postMessage('stop');
      } catch {}
      this.isSearching = false;
    }
    this.onEvaluation = null;
  }

  terminate() {
    this.stop();
    if (this.worker) {
      try { this.worker.postMessage('quit'); } catch {}
      setTimeout(() => {
        if (this.worker) {
          try { this.worker.terminate(); } catch {}
          this.worker = null;
        }
      }, 100);
      this.isReady = false;
      this.initPromise = null;
    }
  }
}

// Singleton instance
let engineInstance = null;

// Evaluation queue to prevent concurrent WASM access
let evalQueue = [];
let isProcessingQueue = false;

export function getStockfishEngine() {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

export function resetStockfishEngine() {
  if (engineInstance) {
    engineInstance.reset();
    engineInstance = null;
  }
  evalQueue = [];
  isProcessingQueue = false;
}

// Process evaluation queue one at a time
async function processQueue() {
  if (isProcessingQueue || evalQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (evalQueue.length > 0) {
    const { fen, onProgress, resolve } = evalQueue.shift();
    
    try {
      const result = await doEvaluate(fen, onProgress);
      resolve(result);
    } catch (err) {
      console.error('Evaluation error:', err);
      resolve(null);
    }
    
    // Small delay between evaluations to let WASM stabilize
    await new Promise(r => setTimeout(r, 50));
  }
  
  isProcessingQueue = false;
}

// Internal evaluation function
async function doEvaluate(fen, onProgress) {
  const engine = getStockfishEngine();

  return new Promise((resolve) => {
    let latestEval = null;
    let resolved = false;

    const doResolve = (result) => {
      if (!resolved) {
        resolved = true;
        engine.stop(); // Ensure search is stopped
        resolve(result);
      }
    };

    // Timeout fallback - return best available eval after 8 seconds
    const timeout = setTimeout(() => {
      if (latestEval) {
        doResolve({
          evaluation: latestEval.evaluation,
          depth: latestEval.depth,
          mateIn: latestEval.mateIn
        });
      } else {
        doResolve(null);
      }
    }, 8000);

    engine.evaluate(fen, (evalData) => {
      latestEval = evalData;

      // Call progress callback for each depth update
      if (onProgress) {
        try {
          onProgress({
            evaluation: evalData.evaluation,
            depth: evalData.depth,
            mateIn: evalData.mateIn
          });
        } catch (err) {
          console.error('Progress callback error:', err);
        }
      }

      // Resolve once we hit max depth
      if (evalData.isFinal) {
        clearTimeout(timeout);
        doResolve({
          evaluation: evalData.evaluation,
          depth: evalData.depth,
          mateIn: evalData.mateIn
        });
      }
    });
  });
}

export async function evaluatePosition(fen) {
  return evaluateWithProgress(fen, null);
}

// For real-time updates during evaluation - queued to prevent WASM crashes
export async function evaluateWithProgress(fen, onProgress) {
  return new Promise((resolve) => {
    // Add to queue
    evalQueue.push({ fen, onProgress, resolve });
    // Start processing if not already
    processQueue();
  });
}

export default StockfishEngine;

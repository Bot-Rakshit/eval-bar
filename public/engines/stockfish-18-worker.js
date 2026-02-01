/**
 * Stockfish 18 WASM Worker Wrapper (Module Worker)
 * Provides compatibility layer for the lichess-org/stockfish-web build
 * Handles NNUE loading and UCI command routing
 */

let stockfish = null;
let isReady = false;
let pendingCommands = [];

async function init() {
  if (typeof SharedArrayBuffer === 'undefined') {
    self.postMessage('info string SharedArrayBuffer not available');
    return;
  }
  
  try {
    const module = await import('./stockfish-18-lite.js');
    
    stockfish = await module.default({
      mainScriptUrlOrBlob: '/engines/stockfish-18-lite.js',
      locateFile: (file) => {
        if (file.endsWith('.wasm')) {
          return '/engines/stockfish-18-lite.wasm';
        }
        return '/engines/' + file;
      },
      listen: (text) => {
        self.postMessage(text);
      },
      onError: () => {}
    });

    // Load the NNUE network
    try {
      const nnueResponse = await fetch('/engines/nn-4ca89e4b3abf.nnue');
      if (nnueResponse.ok) {
        const nnueData = await nnueResponse.arrayBuffer();
        stockfish.setNnueBuffer(new Uint8Array(nnueData), 0);
      }
    } catch (e) {
      // NNUE load failed silently
    }

    isReady = true;
    
    // Process any pending commands
    for (const cmd of pendingCommands) {
      stockfish.uci(cmd);
    }
    pendingCommands = [];
    
  } catch (e) {
    self.postMessage('info string Stockfish 18 initialization failed');
  }
}

self.onmessage = function(e) {
  const cmd = e.data;
  
  if (!isReady) {
    pendingCommands.push(cmd);
    return;
  }
  
  if (stockfish) {
    stockfish.uci(cmd);
  }
};

init();

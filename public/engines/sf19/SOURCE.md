# Stockfish 19 Engine Assets

Chessiro serves Stockfish 19 as WebAssembly and runs it entirely in the browser.
Five interchangeable builds are shipped; the app picks the fastest one the
device supports at runtime (see `apps/web/src/lib/engine/sf19-select.ts`).

## Distributed Artifacts

| File | Threading | Requires |
| --- | --- | --- |
| `sf19-mt-relaxed.js` / `.wasm` | pthreads | `SharedArrayBuffer` (cross-origin isolated) + relaxed SIMD |
| `sf19-mt.js` / `.wasm` | pthreads | `SharedArrayBuffer` (cross-origin isolated) + SIMD |
| `sf19-st-relaxed.js` / `.wasm` | single | relaxed SIMD |
| `sf19-st.js` / `.wasm` | single | WebAssembly SIMD |
| `sf19-st-nosimd.js` / `.wasm` | single | WebAssembly only |

All five embed the same 1.2 MB evaluation network (`nn-61e7af4bb97d.nnue`) and
produce identical search results at equal node counts.

`chessiro-batch-worker.js` is Chessiro wrapper code, not part of Stockfish. It
spawns one of the engine builds as a nested Web Worker and exposes the FEN batch
protocol used by game review and the multi-game DNA report. It is served as
source alongside the engine.

## License

Stockfish is distributed under the GNU General Public License version 3 (or, at
your option, any later version). The license text is served next to the
artifacts as `COPYING.txt`. The same license applies to these WebAssembly
builds and to `chessiro-batch-worker.js`.

## Source

- Engine: Stockfish 19
- Upstream repository: `https://github.com/official-stockfish/Stockfish`
- Evaluation network: `nn-61e7af4bb97d.nnue` (embedded in each `.wasm`)

The `.wasm` and accompanying `.js` glue files are Emscripten builds of the
upstream Stockfish sources, compiled for Chessiro. They differ from a stock
build in two ways, both confined to the WebAssembly entry point rather than the
search or evaluation:

1. Commands received while a search is running are queued until `bestmove`,
   except `stop`, `ponderhit`, `isready`, `uci`, `d` and `quit`, which pass
   through immediately.
2. Malformed input (an invalid FEN, a non-numeric `go depth`) reports
   `info string ERROR: ...` and answers `bestmove (none)` instead of exiting
   the process, which a browser tab cannot recover from.

To obtain the corresponding source for these builds, or the exact upstream
commit and build flags used, contact `support@chessiro.com`.

## Artifact Hashes

```text
0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b  COPYING.txt
526ed42858a88966d453eace6ba6867eb05325e1ff0f9aed6ce14c49fb9fb1e8  chessiro-batch-worker.js
f8c7871133d491227b0a902e0ceca1f18d31c3094f22fdf9c787ee0513d602e3  sf19-mt-relaxed.js
26d669bbfb1c01866bf14d967e3c58bd4754060c89008ad5e6e54f536c263e1a  sf19-mt-relaxed.wasm
df83f7e30bb6db7d38eafc338ea795087cf9f7bf1f76779fb32d989a6d58c49d  sf19-mt.js
86712d30499fb7f99f2e780fcec558e990c9efbcb3201be10730b8d7805b83a6  sf19-mt.wasm
0bea2e52861fe3511c343bdb3d4d068893717a3b7469902bf745a410d76357fb  sf19-st-nosimd.js
8b7f25fe04dc8377bcc5c4f48766bd8e48cf9a334cc37f4bd6e194b7658ea1ce  sf19-st-nosimd.wasm
a01ba364efe8837d86e9e3917809197352afb5471119a8de3a55e7f8283ed546  sf19-st-relaxed.js
231e95044221cc1184f649748b1ac3dd564fb96086040878164e08baf7ca67c6  sf19-st-relaxed.wasm
e07d6d1c5c28f1bf07c821b7dfa9bc0b2c5e3e258ce134dbc1ac6206b3283f3a  sf19-st.js
36f994871023447c0a658313e3680dd7b746d81dd08943da590d7f6f61eb2f2d  sf19-st.wasm
```

Regenerate with `node tools/gen-engine-manifest.mjs`.

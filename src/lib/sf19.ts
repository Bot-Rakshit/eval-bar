/**
 * Picks the best Stockfish 19 WASM build for the current device.
 *
 * Trimmed port of Chessiro's `sf19-select.ts`, which ships alongside these
 * engine builds. The feature-test byte arrays are copied verbatim from the
 * loader that comes with them (originally from wasm-feature-detect, MIT).
 *
 * Engine URLs are always same-origin: a `Worker` cannot load a cross-origin
 * script, and the `-mt` builds re-load their own URL for each pthread.
 */

export const SF19_VERSION = "19.0.0";

const SF19_BASE_PATH = "/engines/sf19";

/** Ordered strongest → most compatible. The fallback chain walks it forwards. */
export const SF19_VARIANTS = [
  "sf19-mt-relaxed",
  "sf19-mt",
  "sf19-st-relaxed",
  "sf19-st",
  "sf19-st-nosimd",
] as const;

export type Sf19Variant = (typeof SF19_VARIANTS)[number];

export interface Sf19Features {
  wasm: boolean;
  simd: boolean;
  relaxedSimd: boolean;
  threads: boolean;
  hardwareConcurrency: number;
}

export interface Sf19Selection {
  variant: Sf19Variant;
  url: string;
  /** True for a pthreads build, where `setoption name Threads` is honoured. */
  threads: boolean;
  /** Suggested value for `setoption name Threads`. 1 for the `-st` builds. */
  maxThreads: number;
  features: Sf19Features;
}

// Feature-test modules (from wasm-feature-detect, MIT).
const SIMD_MODULE: readonly number[] = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8,
  0, 65, 0, 253, 15, 253, 98, 11,
];
const RELAXED_MODULE: readonly number[] = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1,
  13, 0, 65, 1, 253, 15, 65, 2, 253, 15, 253, 128, 2, 11,
];
const THREADS_MODULE: readonly number[] = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1,
  10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11,
];

function validate(bytes: readonly number[]): boolean {
  try {
    return typeof WebAssembly === "object" && WebAssembly.validate(new Uint8Array(bytes));
  } catch {
    return false;
  }
}

function hasThreads(): boolean {
  if (!validate(THREADS_MODULE)) return false;
  if (typeof SharedArrayBuffer === "undefined") return false;
  // Browsers only hand out a shareable SAB on a cross-origin isolated page.
  // vercel.json sets COOP/COEP, so the deployed overlay qualifies.
  if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) return false;
  try {
    // Some engines expose the constructor but refuse to postMessage the buffer.
    new MessageChannel().port1.postMessage(new SharedArrayBuffer(1));
    return true;
  } catch {
    return false;
  }
}

/**
 * Phones and tablets get the single-threaded engine even where SharedArrayBuffer
 * exists: iOS Safari kills and restarts pthread workers under memory pressure,
 * which reads as the engine stalling mid-search. iPadOS reports a desktop UA, so
 * touch-capable Macs with few cores count as mobile too.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|IEMobile|Opera Mini/i.test(ua)) return true;
  const touchPoints = navigator.maxTouchPoints || 0;
  const cores = navigator.hardwareConcurrency || 1;
  return /Macintosh/.test(ua) && touchPoints > 1 && cores <= 8;
}

export function detectSf19Features(): Sf19Features {
  const simd = validate(SIMD_MODULE);
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 1;
  return {
    wasm: typeof WebAssembly === "object",
    simd,
    relaxedSimd: simd && validate(RELAXED_MODULE),
    threads: hasThreads() && !isMobileDevice(),
    hardwareConcurrency: Math.max(1, Number(cores) || 1),
  };
}

export function getSf19WorkerUrl(variant: Sf19Variant): string {
  return `${SF19_BASE_PATH}/${variant}.js?v=${SF19_VERSION}`;
}

/** Can this device actually run the variant? */
export function isSf19VariantSupported(variant: Sf19Variant, features: Sf19Features): boolean {
  if (!features.wasm) return false;
  if (variant.startsWith("sf19-mt") && !features.threads) return false;
  if (variant.endsWith("-relaxed") && !features.relaxedSimd) return false;
  if (variant === "sf19-st") return features.simd;
  return true;
}

/**
 * The overlay evaluates one position at a time off a queue, so a few threads is
 * a straight speedup. Capped well below core count: OBS is running an encoder
 * on the same machine and the bars are never the only thing on screen.
 */
const MAX_THREADS = 4;

function buildSelection(variant: Sf19Variant, features: Sf19Features): Sf19Selection {
  const threads = variant.startsWith("sf19-mt");
  const cores = features.hardwareConcurrency;
  return {
    variant,
    url: getSf19WorkerUrl(variant),
    threads,
    maxThreads: threads ? Math.max(1, Math.min(MAX_THREADS, cores > 2 ? cores - 1 : cores)) : 1,
    features,
  };
}

/** Best variant for this device, or null when WebAssembly is unavailable. */
export function selectSf19Variant(features = detectSf19Features()): Sf19Selection | null {
  if (!features.wasm) return null;

  let variant: Sf19Variant;
  if (!features.simd) variant = "sf19-st-nosimd";
  else if (features.threads) variant = features.relaxedSimd ? "sf19-mt-relaxed" : "sf19-mt";
  else variant = features.relaxedSimd ? "sf19-st-relaxed" : "sf19-st";

  return buildSelection(variant, features);
}

/**
 * The chosen variant plus every weaker one this device can still run, in the
 * order init should retry them.
 */
export function getSf19FallbackChain(selection: Sf19Selection): Sf19Selection[] {
  const start = SF19_VARIANTS.indexOf(selection.variant);
  const rest = SF19_VARIANTS.slice(start + 1)
    .filter((variant) => isSf19VariantSupported(variant, selection.features))
    .map((variant) => buildSelection(variant, selection.features));
  return [selection, ...rest];
}

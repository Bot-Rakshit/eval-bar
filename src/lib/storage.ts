import { BarCustomizations, mergeCustomizations } from "../types";

// v3: the board-card design with the neutral palette. Saved v2 picks were
// the old bar's colours, so they are left behind rather than carried over.
const STORAGE_KEY = "evalbar.customizations.v3";

export function loadStoredCustomizations(): BarCustomizations {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return mergeCustomizations(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeCustomizations(null);
  }
}

export function storeCustomizations(customizations: BarCustomizations): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customizations));
  } catch {
    /* storage unavailable (private mode / OBS) */
  }
}

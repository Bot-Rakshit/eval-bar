import { BarCustomizations, mergeCustomizations } from "../types";

// v4: Crimson with the filled notch became the default (v3 was Neutral), so
// earlier saved picks are left behind and everyone starts on the new look.
const STORAGE_KEY = "evalbar.customizations.v4";

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

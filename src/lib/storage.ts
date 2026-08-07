import { BarCustomizations, mergeCustomizations } from "../types";

const STORAGE_KEY = "evalbar.customizations.v2";

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

export type ScanInputMode = 'scanner' | 'camera' | 'keyboard';

const STORAGE_KEY = 'packing-list-scan-input-mode';
const CHOSEN_KEY = 'packing-list-scan-input-mode-chosen';

export function loadScanInputMode(): ScanInputMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'scanner' || raw === 'camera' || raw === 'keyboard') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'scanner';
}

export function saveScanInputMode(mode: ScanInputMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  localStorage.setItem(CHOSEN_KEY, '1');
}

export function hasScanInputModeChosen() {
  try {
    return localStorage.getItem(CHOSEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearScanInputModeChoice() {
  localStorage.removeItem(CHOSEN_KEY);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanInputMode } from '@scan-goods/shared';

export type { ScanInputMode };

const STORAGE_KEY = 'packing-list-scan-input-mode';
const CHOSEN_KEY = 'packing-list-scan-input-mode-chosen';

export async function loadScanInputMode(): Promise<ScanInputMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'scanner' || raw === 'camera') {
      return raw;
    }
    if (raw === 'keyboard') {
      return 'scanner';
    }
  } catch {
    /* ignore */
  }
  return 'scanner';
}

export async function saveScanInputMode(mode: ScanInputMode) {
  const normalized = mode === 'keyboard' ? 'scanner' : mode;
  await AsyncStorage.setItem(STORAGE_KEY, normalized);
  await AsyncStorage.setItem(CHOSEN_KEY, '1');
}

export async function hasScanInputModeChosen() {
  try {
    return (await AsyncStorage.getItem(CHOSEN_KEY)) === '1';
  } catch {
    return false;
  }
}

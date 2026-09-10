import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'packing-list-sound-enabled';

export async function loadSoundEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export async function saveSoundEnabled(enabled: boolean) {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}

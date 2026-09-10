import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LABEL_TEMPLATE_LABEL,
  PACKING_TEMPLATE_OPTIONS,
  orgPrintKey,
  type LabelTemplateId,
  type PackingTemplateId,
  type PrintSettings,
} from '@scan-goods/shared';

export { LABEL_TEMPLATE_LABEL, PACKING_TEMPLATE_OPTIONS };
export type { LabelTemplateId, PackingTemplateId, PrintSettings };

const STORAGE_KEY = 'packing-list-print-settings';

const DEFAULT_SETTINGS: PrintSettings = {
  labelPrinterName: '',
  a4PrinterName: '',
  labelTemplateId: 'default',
  packingTemplateId: 'by-box',
  orgKey: '',
};

function normalizePrintSettings(raw: Partial<PrintSettings>): PrintSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    labelTemplateId: 'default',
  };
}

export async function loadPrintSettings(): Promise<PrintSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizePrintSettings(JSON.parse(raw) as Partial<PrintSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function savePrintSettings(next: PrintSettings) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizePrintSettings(next)),
  );
}

export async function resolvePrintSettingsForOrg(
  company?: string,
  branch?: string,
): Promise<PrintSettings> {
  const settings = await loadPrintSettings();
  const key = orgPrintKey(company, branch);
  if (settings.orgKey && settings.orgKey !== key) {
    return { ...settings, orgKey: key };
  }
  if (!settings.orgKey) {
    return { ...settings, orgKey: key };
  }
  return settings;
}

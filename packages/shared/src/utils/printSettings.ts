import { th } from '../text/th';

const STORAGE_KEY = 'packing-list-print-settings';

export type LabelTemplateId = 'default';
export type PackingTemplateId = 'default' | 'by-box';

export interface PrintSettings {
  labelPrinterName: string;
  a4PrinterName: string;
  labelTemplateId: LabelTemplateId;
  packingTemplateId: PackingTemplateId;
  /** คีย์บริษัท|สาขา ที่ผูก template ล่าสุด */
  orgKey: string;
}

export const LABEL_TEMPLATE_LABEL = th.printTemplates.labelDefault;

export const PACKING_TEMPLATE_OPTIONS: Array<{
  id: PackingTemplateId;
  label: string;
}> = [
  { id: 'default', label: th.printTemplates.packingDefault },
  { id: 'by-box', label: th.printTemplates.packingByBox },
];

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

export function orgPrintKey(company?: string, branch?: string) {
  return `${company?.trim() || '-'}|${branch?.trim() || '-'}`;
}

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizePrintSettings(JSON.parse(raw) as Partial<PrintSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function savePrintSettings(next: PrintSettings) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizePrintSettings(next)),
  );
}

export function resolvePrintSettingsForOrg(
  company?: string,
  branch?: string,
): PrintSettings {
  const settings = loadPrintSettings();
  const key = orgPrintKey(company, branch);
  if (settings.orgKey && settings.orgKey !== key) {
    return { ...settings, orgKey: key };
  }
  if (!settings.orgKey) {
    return { ...settings, orgKey: key };
  }
  return settings;
}

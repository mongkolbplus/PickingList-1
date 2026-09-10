import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from '../utils/uuid';

export type PrintDocType = 'label' | 'packing';

export interface PrintHistoryEntry {
  id: string;
  at: string;
  type: PrintDocType;
  title: string;
  documentRef: string;
  boxNos: number[];
  copies: number;
  printerProfile: 'label' | 'a4';
  templateId: string;
  html: string;
  user?: string;
}

const STORAGE_KEY = 'packing-list-print-history';
const MAX_ENTRIES = 100;

async function readAll(): Promise<PrintHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PrintHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: PrintHistoryEntry[]) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export async function listPrintHistory(documentRef?: string): Promise<PrintHistoryEntry[]> {
  const all = (await readAll()).sort((a, b) => b.at.localeCompare(a.at));
  if (!documentRef) return all;
  return all.filter((entry) => entry.documentRef === documentRef);
}

export async function addPrintHistory(
  entry: Omit<PrintHistoryEntry, 'id' | 'at'> & { at?: string },
): Promise<PrintHistoryEntry> {
  const record: PrintHistoryEntry = {
    id: createId(),
    at: entry.at ?? new Date().toISOString(),
    type: entry.type,
    title: entry.title,
    documentRef: entry.documentRef,
    boxNos: entry.boxNos,
    copies: entry.copies,
    printerProfile: entry.printerProfile,
    templateId: entry.templateId,
    html: entry.html,
    user: entry.user,
  };
  await writeAll([record, ...(await readAll())]);
  return record;
}

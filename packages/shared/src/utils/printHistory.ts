import { createId } from './createId';

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

function readAll(): PrintHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PrintHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PrintHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function listPrintHistory(documentRef?: string): PrintHistoryEntry[] {
  const all = readAll().sort((a, b) => b.at.localeCompare(a.at));
  if (!documentRef) return all;
  return all.filter((entry) => entry.documentRef === documentRef);
}

export function addPrintHistory(
  entry: Omit<PrintHistoryEntry, 'id' | 'at'> & { at?: string },
): PrintHistoryEntry {
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
  writeAll([record, ...readAll()]);
  return record;
}

export function getPrintHistoryEntry(id: string): PrintHistoryEntry | null {
  return readAll().find((entry) => entry.id === id) ?? null;
}

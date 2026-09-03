import { create } from 'zustand';
import type { DocumentListItem, JobRecord, ScanSession } from '@scan-goods/shared';
import {
  buildPackingClosePayload,
  localCloseBox,
  localScan,
  localUndoLastScan,
  preparePackingSession,
} from '@scan-goods/shared';
import { parseBarcodeInput } from '@scan-goods/shared';
import { saveSessionSnapshot, saveJobRecord } from '../services/database';
import { createId } from '../utils/uuid';

interface PackingState {
  session: ScanSession | null;
  selectedDocs: DocumentListItem[];
  jobs: JobRecord[];
  lastScanMessage: string | null;
  setSelectedDocs: (docs: DocumentListItem[]) => void;
  setSession: (session: ScanSession | null) => Promise<void>;
  restoreSession: (session: ScanSession) => Promise<void>;
  scanBarcode: (raw: string) => Promise<string>;
  undoLastScan: () => Promise<void>;
  closeCurrentBox: () => Promise<void>;
  createNewBox: () => Promise<void>;
  loadJobs: (jobs: JobRecord[]) => void;
  pauseSession: () => Promise<void>;
}

async function persistSession(session: ScanSession | null) {
  if (session) await saveSessionSnapshot(session);
}

export const usePackingStore = create<PackingState>((set, get) => ({
  session: null,
  selectedDocs: [],
  jobs: [],
  lastScanMessage: null,

  setSelectedDocs: (docs) => set({ selectedDocs: docs }),

  setSession: async (session) => {
    const prepared = session ? preparePackingSession(session) : null;
    set({ session: prepared });
    await persistSession(prepared);
  },

  restoreSession: async (session) => {
    set({ session });
    await persistSession(session);
  },

  scanBarcode: async (raw) => {
    const { session } = get();
    if (!session) throw new Error('ไม่มี session');
    const { barcode, multiplier } = parseBarcodeInput(raw);
    const result = localScan(session, { barcode, multiplier });
    const next = result.session;
    const message = `สแกนสำเร็จ กล่องที่ ${result.currentBoxNo}`;
    set({ session: next, lastScanMessage: message });
    await persistSession(next);
    return message;
  },

  undoLastScan: async () => {
    const { session } = get();
    if (!session) return;
    const next = localUndoLastScan(session).session;
    set({ session: next, lastScanMessage: 'ยกเลิกรายการล่าสุด' });
    await persistSession(next);
  },

  closeCurrentBox: async () => {
    const { session } = get();
    if (!session) return;
    const result = localCloseBox(session);
    set({
      session: result.session,
      lastScanMessage: `ปิดกล่องที่ ${result.closedBoxNo} แล้ว`,
    });
    await persistSession(result.session);
  },

  createNewBox: async () => {
    const { session } = get();
    if (!session) return;
    const maxBox = Math.max(
      session.currentBoxNo,
      ...session.boxes.map((b) => b.boxNo),
      0,
    );
    const next = { ...session, currentBoxNo: maxBox + 1 };
    set({ session: next, lastScanMessage: `สร้างกล่องใหม่ #${next.currentBoxNo}` });
    await persistSession(next);
  },

  loadJobs: (jobs) => set({ jobs }),

  pauseSession: async () => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, status: 'paused' as const, workflowStatus: 'พักงาน' as const };
    set({ session: next });
    await persistSession(next);
    const job: JobRecord = {
      id: createId(),
      sessionId: next.sessionId,
      documentRefs: next.documents.map((d) => d.diRef),
      customerName: next.documents[0]?.partyName,
      workflowStatus: 'พักงาน',
      boxCount: next.boxes.length,
      scannedQty: next.items.reduce((s, i) => s + i.scanQty, 0),
      startedAt: next.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [],
    };
    await saveJobRecord(job);
    const jobs = [job, ...get().jobs].slice(0, 100);
    set({ jobs });
  },
}));

export function buildClosePayloadFromSession(
  session: ScanSession,
  checkerName?: string,
  notes?: string,
  allowPartial?: boolean,
) {
  return buildPackingClosePayload(session, { checkerName, notes, allowPartial });
}

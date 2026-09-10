import { create } from 'zustand';
import type { DocumentListItem, JobRecord, ScanSession } from '@scan-goods/shared';
import {
  buildPackingClosePayload,
  localCloseBox,
  localScan,
  localUndoLastScan,
  preparePackingSession,
  th,
} from '@scan-goods/shared';
import { parseBarcodeInput } from '@scan-goods/shared';
import { saveSessionSnapshot, loadJobHistory } from '../services/database';
import { upsertJobFromSession } from '../services/jobStorage';

interface PackingState {
  session: ScanSession | null;
  selectedDocs: DocumentListItem[];
  jobs: JobRecord[];
  lastScanMessage: string | null;
  setSelectedDocs: (docs: DocumentListItem[]) => void;
  setSession: (session: ScanSession | null) => Promise<void>;
  startSession: (session: ScanSession, packerName?: string) => Promise<void>;
  updateSession: (session: ScanSession) => Promise<void>;
  restoreSession: (session: ScanSession) => Promise<void>;
  scanBarcode: (raw: string) => Promise<string>;
  undoLastScan: () => Promise<void>;
  closeCurrentBox: () => Promise<void>;
  createNewBox: () => Promise<void>;
  loadJobs: (jobs: JobRecord[]) => void;
  pauseSession: () => Promise<void>;
  closeSession: (
    current: ScanSession,
    meta: { checkerName?: string; notes?: string; allowPartial?: boolean },
  ) => Promise<void>;
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

  startSession: async (raw, packerName) => {
    const next = preparePackingSession({
      ...raw,
      packerName,
      workflowStatus: th.workflow.packing,
      status: 'open',
    });
    console.log('[StartPacking] startSession:save', {
      sessionId: next.sessionId,
      packerName: packerName ?? null,
      documentCount: next.documents.length,
      itemCount: next.items.length,
      activePartyCode: next.activePartyCode ?? null,
      currentBoxNo: next.currentBoxNo,
    });
    set({ session: next });
    await persistSession(next);
    const job = await upsertJobFromSession(next, {
      workflowStatus: th.workflow.packing,
      packerName,
      action: th.jobActions.start,
    });
    const jobs = await loadJobHistory(200);
    set({ jobs: jobs.length ? jobs : [job] });
    console.log('[StartPacking] startSession:complete', {
      sessionId: next.sessionId,
      jobId: job.id,
    });
  },

  updateSession: async (session) => {
    set({ session });
    await persistSession(session);
    const job = await upsertJobFromSession(session, {
      workflowStatus: session.workflowStatus ?? th.workflow.packing,
      packerName: session.packerName,
      action: th.jobActions.update,
    });
    const jobs = await loadJobHistory(200);
    set({ jobs: jobs.length ? jobs : [job] });
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
    const next = {
      ...session,
      status: 'paused' as const,
      workflowStatus: th.workflow.paused,
    };
    set({ session: next });
    await persistSession(next);
    const job = await upsertJobFromSession(next, {
      workflowStatus: th.workflow.paused,
      packerName: next.packerName,
      action: th.jobActions.pause,
    });
    const jobs = await loadJobHistory(200);
    set({ jobs: jobs.length ? jobs : [job] });
  },

  closeSession: async (current, meta) => {
    const next: ScanSession = {
      ...current,
      status: 'confirmed',
      workflowStatus: th.workflow.done,
      checkerName: meta.checkerName,
      notes: meta.notes,
    };
    set({ session: next });
    await persistSession(next);
    const job = await upsertJobFromSession(next, {
      workflowStatus: th.workflow.done,
      packerName: next.packerName,
      checkerName: meta.checkerName,
      action: meta.allowPartial ? th.jobActions.closePartial : th.jobActions.close,
      detail: meta.notes,
    });
    const jobs = await loadJobHistory(200);
    set({ jobs: jobs.length ? jobs : [job] });
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

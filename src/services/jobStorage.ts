import type { JobRecord, ScanSession, WorkflowStatus } from '@scan-goods/shared';
import { th } from '@scan-goods/shared';
import { loadJobHistory, saveJobRecord } from './database';
import { createId } from '../utils/uuid';

function isClosedStatus(status: WorkflowStatus) {
  return status === th.workflow.done || status === th.workflow.closedLegacy;
}

export async function upsertJobFromSession(
  session: ScanSession,
  meta: {
    workflowStatus: WorkflowStatus;
    packerName?: string;
    checkerName?: string;
    action?: string;
    detail?: string;
  },
): Promise<JobRecord> {
  const jobs = await loadJobHistory(200);
  const now = new Date().toISOString();
  const scannedQty = session.items.reduce((sum, item) => sum + item.scanQty, 0);
  const existing = jobs.find((job) => job.sessionId === session.sessionId);

  const record: JobRecord = {
    id: existing?.id ?? createId(),
    sessionId: session.sessionId,
    documentRefs: session.documents.map((doc) => doc.diRef),
    customerName: session.documents[0]?.partyName,
    workflowStatus: meta.workflowStatus,
    boxCount: session.boxes.filter((box) => box.closedAt).length,
    scannedQty,
    packerName: meta.packerName ?? existing?.packerName,
    checkerName: meta.checkerName ?? existing?.checkerName,
    startedAt: existing?.startedAt ?? session.startedAt ?? now,
    updatedAt: now,
    closedAt: isClosedStatus(meta.workflowStatus) ? now : existing?.closedAt,
    printedAt:
      meta.workflowStatus === th.workflow.printed ? now : existing?.printedAt,
    auditLog: [
      ...(existing?.auditLog ?? []),
      {
        at: now,
        action: meta.action ?? meta.workflowStatus,
        detail: meta.detail,
        user: meta.packerName,
      },
    ],
  };

  await saveJobRecord(record);
  return record;
}

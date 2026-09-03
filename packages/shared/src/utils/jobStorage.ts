import type { ScanSession } from '../api/client';
import type { JobRecord, WorkflowStatus } from '../types/packing';
import { th } from '../text/th';

const ACTIVE_SESSION_KEY = 'packing-list-active-session';
const JOBS_KEY = 'packing-list-jobs';

function readJobs(): JobRecord[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as JobRecord[]) : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: JobRecord[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function saveActiveSession(session: ScanSession | null) {
  if (!session) {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function loadActiveSession(): ScanSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as ScanSession) : null;
  } catch {
    return null;
  }
}

function isClosedStatus(status: WorkflowStatus) {
  return status === th.workflow.done || status === th.workflow.closedLegacy;
}

export function upsertJobFromSession(
  session: ScanSession,
  meta: {
    workflowStatus: WorkflowStatus;
    packerName?: string;
    checkerName?: string;
    action?: string;
    detail?: string;
  },
): JobRecord {
  const jobs = readJobs();
  const now = new Date().toISOString();
  const scannedQty = session.items.reduce((sum, i) => sum + i.scanQty, 0);
  const existing = jobs.find((j) => j.sessionId === session.sessionId);

  const record: JobRecord = {
    id: existing?.id ?? crypto.randomUUID(),
    sessionId: session.sessionId,
    documentRefs: session.documents.map((d) => d.diRef),
    customerName: session.documents[0]?.partyName,
    workflowStatus: meta.workflowStatus,
    boxCount: session.boxes.filter((b) => b.closedAt).length,
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

  const next = existing
    ? jobs.map((j) => (j.id === record.id ? record : j))
    : [record, ...jobs];
  writeJobs(next.slice(0, 200));
  return record;
}

export function listJobs(): JobRecord[] {
  return readJobs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getJobById(id: string): JobRecord | null {
  return readJobs().find((job) => job.id === id) ?? null;
}

export function dashboardStats(jobs: JobRecord[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter((j) => j.updatedAt.startsWith(today));
  const doneStatuses: WorkflowStatus[] = [
    th.workflow.closedLegacy,
    th.workflow.done,
    th.workflow.printed,
  ];

  return {
    waiting: jobs.filter((j) => j.workflowStatus === th.workflow.waiting).length,
    inProgress: jobs.filter((j) => j.workflowStatus === th.workflow.packing).length,
    done: jobs.filter((j) => doneStatuses.includes(j.workflowStatus)).length,
    problem: jobs.filter((j) => String(j.workflowStatus).includes('ปัญห')).length,
    boxesToday: todayJobs.reduce((sum, j) => sum + j.boxCount, 0),
    scannedToday: todayJobs.reduce((sum, j) => sum + j.scannedQty, 0),
  };
}

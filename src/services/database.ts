import * as SQLite from 'expo-sqlite';
import type { ScanSession } from '@scan-goods/shared';
import type { JobRecord } from '@scan-goods/shared';
import { createId } from '../utils/uuid';

export type QueueType = 'SAVE_PACKING_CLOSE';
export type QueueStatus = 'pending' | 'processing' | 'failed' | 'done';

export interface QueueItem {
  id: string;
  type: QueueType;
  payload: string;
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  createdAt: number;
  nextRetryAt: number | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('packing_list.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS offline_queue (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          max_retries INTEGER NOT NULL DEFAULT 5,
          last_error TEXT,
          created_at INTEGER NOT NULL,
          next_retry_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS scan_sessions (
          session_id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS job_history (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function saveSessionSnapshot(session: ScanSession) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO scan_sessions (session_id, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [session.sessionId, JSON.stringify(session), Date.now()],
  );
}

export async function loadSessionSnapshot(sessionId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM scan_sessions WHERE session_id = ?',
    [sessionId],
  );
  return row ? (JSON.parse(row.data) as ScanSession) : null;
}

export async function loadLatestSessionSnapshot() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM scan_sessions ORDER BY updated_at DESC LIMIT 1',
  );
  return row ? (JSON.parse(row.data) as ScanSession) : null;
}

export async function enqueueOfflineItem(
  type: QueueType,
  payload: unknown,
  maxRetries = 5,
) {
  const db = await getDatabase();
  const item: QueueItem = {
    id: createId(),
    type,
    payload: JSON.stringify(payload),
    status: 'pending',
    retryCount: 0,
    maxRetries,
    lastError: null,
    createdAt: Date.now(),
    nextRetryAt: null,
  };
  await db.runAsync(
    `INSERT INTO offline_queue (id, type, payload, status, retry_count, max_retries, last_error, created_at, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.type,
      item.payload,
      item.status,
      item.retryCount,
      item.maxRetries,
      item.lastError,
      item.createdAt,
      item.nextRetryAt,
    ],
  );
  return item;
}

export async function fetchPendingQueueItems() {
  const db = await getDatabase();
  const now = Date.now();
  const rows = await db.getAllAsync<QueueItem>(
    `SELECT id, type, payload, status, retry_count as retryCount, max_retries as maxRetries,
            last_error as lastError, created_at as createdAt, next_retry_at as nextRetryAt
     FROM offline_queue
     WHERE status IN ('pending', 'failed')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC`,
    [now],
  );
  return rows;
}

export async function countPendingQueueItems() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_queue WHERE status IN ('pending', 'failed')`,
  );
  return row?.count ?? 0;
}

export async function updateQueueItem(
  id: string,
  patch: Partial<Pick<QueueItem, 'status' | 'retryCount' | 'lastError' | 'nextRetryAt'>>,
) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<QueueItem>(
    `SELECT retry_count as retryCount, max_retries as maxRetries FROM offline_queue WHERE id = ?`,
    [id],
  );
  if (!current) return;

  await db.runAsync(
    `UPDATE offline_queue
     SET status = COALESCE(?, status),
         retry_count = COALESCE(?, retry_count),
         last_error = COALESCE(?, last_error),
         next_retry_at = ?
     WHERE id = ?`,
    [
      patch.status ?? null,
      patch.retryCount ?? null,
      patch.lastError ?? null,
      patch.nextRetryAt ?? null,
      id,
    ],
  );
}

export async function saveJobRecord(job: JobRecord) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO job_history (id, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [job.id, JSON.stringify(job), Date.now()],
  );
}

export async function loadJobHistory(limit = 50) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM job_history ORDER BY updated_at DESC LIMIT ?',
    [limit],
  );
  return rows.map((r) => JSON.parse(r.data) as JobRecord);
}

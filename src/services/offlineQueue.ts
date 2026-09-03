import {
  savePackingScaninfo,
  type PackingClosePayload,
} from '@scan-goods/shared';
import {
  countPendingQueueItems,
  enqueueOfflineItem,
  fetchPendingQueueItems,
  updateQueueItem,
  type QueueItem,
} from './database';

export interface SavePackingCloseQueuePayload {
  clientRequestId: string;
  loginGuid: string;
  closePayload: PackingClosePayload;
  sessionId: string;
}

let processing = false;
let listeners: Array<() => void> = [];

export function subscribeQueue(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

function backoffMs(retryCount: number) {
  return Math.min(60_000, 1000 * 2 ** retryCount);
}

async function processItem(item: QueueItem) {
  if (item.type !== 'SAVE_PACKING_CLOSE') return;

  await updateQueueItem(item.id, { status: 'processing' });
  const body = JSON.parse(item.payload) as SavePackingCloseQueuePayload;

  try {
    await savePackingScaninfo(body.loginGuid, body.closePayload);
    await updateQueueItem(item.id, { status: 'done', lastError: null, nextRetryAt: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ส่งข้อมูลไม่สำเร็จ';
    const nextRetry = item.retryCount + 1;
    if (nextRetry >= item.maxRetries) {
      await updateQueueItem(item.id, {
        status: 'failed',
        retryCount: nextRetry,
        lastError: message,
        nextRetryAt: Date.now() + backoffMs(nextRetry),
      });
    } else {
      await updateQueueItem(item.id, {
        status: 'pending',
        retryCount: nextRetry,
        lastError: message,
        nextRetryAt: Date.now() + backoffMs(nextRetry),
      });
    }
    throw error;
  }
}

export async function queueSavePackingClose(payload: SavePackingCloseQueuePayload) {
  await enqueueOfflineItem('SAVE_PACKING_CLOSE', payload);
  notify();
}

export async function processOfflineQueue() {
  if (processing) return;
  processing = true;
  try {
    const items = await fetchPendingQueueItems();
    for (const item of items) {
      try {
        await processItem(item);
      } catch {
        // continue with next item
      }
    }
  } finally {
    processing = false;
    notify();
  }
}

export async function getPendingQueueCount() {
  return countPendingQueueItems();
}

export async function submitPackingClose(
  loginGuid: string,
  closePayload: PackingClosePayload,
  sessionId: string,
  isOnline: boolean,
) {
  if (isOnline) {
    try {
      await savePackingScaninfo(loginGuid, closePayload);
      return { queued: false as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const networkLike =
        message.includes('Network') ||
        message.includes('fetch') ||
        message.includes('Failed');
      if (!networkLike) throw error;
    }
  }

  await queueSavePackingClose({
    clientRequestId: `${sessionId}-${Date.now()}`,
    loginGuid,
    closePayload,
    sessionId,
  });
  return { queued: true as const };
}

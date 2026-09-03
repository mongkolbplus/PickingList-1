import { useCallback, useEffect, useState } from 'react';
import {
  getPendingQueueCount,
  processOfflineQueue,
  subscribeQueue,
} from '../services/offlineQueue';
import { useNetwork } from './useNetwork';

export function useOfflineQueue() {
  const { isOnline } = useNetwork();
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    setPendingCount(await getPendingQueueCount());
  }, []);

  const retry = useCallback(async () => {
    await processOfflineQueue();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    return subscribeQueue(refresh);
  }, [refresh]);

  useEffect(() => {
    if (isOnline) {
      void processOfflineQueue().then(refresh);
    }
  }, [isOnline, refresh]);

  return { isOnline, pendingCount, retry, refresh };
}

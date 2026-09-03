import type { ScanSession } from '../api/client';
import { itemsForActiveScope } from './packingSessionUtils';

export function calcSessionProgress(session: ScanSession) {
  const items = itemsForActiveScope(session);

  const documentQty = items.reduce((sum, i) => sum + i.documentQty + i.freeQty, 0);
  const scannedQty = items.reduce((sum, i) => sum + i.scanQty, 0);
  const remainingQty = items.reduce((sum, i) => sum + i.remainingQty, 0);
  const percent =
    documentQty > 0 ? Math.min(100, Math.round((scannedQty / documentQty) * 100)) : 0;

  return { documentQty, scannedQty, remainingQty, percent };
}

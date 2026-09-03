import type { ScanSession } from '../api/client';
import type { CloseJobSummary } from '../types/packing';
import { th } from '../text/th';

export function buildCloseJobSummary(session: ScanSession): CloseJobSummary {
  const documentQty = session.items.reduce(
    (sum, i) => sum + i.documentQty + i.freeQty,
    0,
  );
  const scannedQty = session.items.reduce((sum, i) => sum + i.scanQty, 0);
  const remainingQty = session.items.reduce((sum, i) => sum + i.remainingQty, 0);
  const shortQty = remainingQty;
  const overQty = Math.max(0, scannedQty - documentQty);
  const boxCount = session.boxes.filter((b) => b.closedAt).length;
  const anomalies: string[] = [];

  if (shortQty > 0) anomalies.push(th.confirm.anomalyShort(shortQty));
  if (overQty > 0) anomalies.push(th.confirm.anomalyOver(overQty));
  if (session.items.some((i) => i.scanQty > 0 && i.remainingQty > 0 && i.boxNo === 0)) {
    anomalies.push(th.confirm.anomalyNotBoxed);
  }
  if (session.items.some((i) => i.remainingQty === 0 && i.boxNo === 0 && i.scanQty > 0)) {
    anomalies.push(th.confirm.anomalyBoxNotClosed);
  }

  return {
    documentQty,
    scannedQty,
    shortQty,
    overQty,
    boxCount,
    anomalies,
  };
}

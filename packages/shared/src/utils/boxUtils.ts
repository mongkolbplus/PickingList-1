import type { ScanSession } from '../api/client';
import { itemsForActiveScope } from './packingSessionUtils';

export interface CurrentBoxLineRow {
  rowKey: string;
  boxNo: number;
  goodsCode: string;
  totalQty: number;
  totalWeight: number;
}

export function formatWeight(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function aggregateCurrentBoxLines(
  session: ScanSession,
): CurrentBoxLineRow[] {
  const groups = new Map<string, CurrentBoxLineRow>();
  const scopeItemIds = new Set(
    itemsForActiveScope(session).map((item) => item.itemId),
  );

  for (const item of session.items) {
    if (item.boxNo !== session.currentBoxNo || item.scanQty <= 0) continue;
    if (
      session.module === 'PackingList' &&
      scopeItemIds.size > 0 &&
      !scopeItemIds.has(item.itemId)
    ) {
      continue;
    }

    const rowKey = `${item.boxNo}:${item.goodsCode}`;
    const existing = groups.get(rowKey);
    if (!existing) {
      groups.set(rowKey, {
        rowKey,
        boxNo: item.boxNo,
        goodsCode: item.goodsCode,
        totalQty: item.scanQty,
        totalWeight: item.unitWeight * item.scanQty,
      });
      continue;
    }

    existing.totalQty += item.scanQty;
    existing.totalWeight += item.unitWeight * item.scanQty;
  }

  return [...groups.values()].sort((a, b) => a.rowKey.localeCompare(b.rowKey));
}

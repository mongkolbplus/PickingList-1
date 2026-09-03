import type { ScanSession, ScanSessionItem } from '../api/client';
import { itemsForActiveScope } from './packingSessionUtils';

export type LotPolicy = 'FIFO' | 'FEFO';

const LOT_POLICY_KEY = 'packing-list.lotPolicy';

export interface WarehouseLotOption {
  lotNo: string;
  goodsCode: string;
  qtyOnHand: number;
  mfgDate?: string;
  expDate?: string;
}

export interface ScanRequirements {
  needsLot: boolean;
  needsSerial: boolean;
  candidates: ScanSessionItem[];
  goodsCode: string;
  skuName: string;
}

function isTruthy(value?: string | null) {
  if (!value?.trim()) return false;
  const token = value.trim().toUpperCase();
  return token === 'Y' || token === '1' || token === 'T' || token === 'TRUE';
}

export function getLotPolicy(): LotPolicy {
  const stored = localStorage.getItem(LOT_POLICY_KEY);
  return stored === 'FEFO' ? 'FEFO' : 'FIFO';
}

export function setLotPolicy(policy: LotPolicy) {
  localStorage.setItem(LOT_POLICY_KEY, policy);
}

export function itemRequiresSerial(item: ScanSessionItem) {
  if (item.requiresSerial) return true;
  return Boolean(item.serialNo?.trim());
}

export function itemRequiresLot(item: ScanSessionItem) {
  if (item.requiresLot) return true;
  return Boolean(item.lotNo?.trim());
}

export function itemNeedsSerialCapture(item: ScanSessionItem) {
  return item.requiresSerial === true;
}

export function itemNeedsLotCapture(item: ScanSessionItem) {
  return item.requiresLot === true;
}

export function matchesBarcode(item: ScanSessionItem, barcode: string) {
  return item.goodsCode === barcode || item.skuCode === barcode;
}

export function findOpenCandidates(session: ScanSession, barcode: string) {
  return itemsForActiveScope(session).filter(
    (item) => item.remainingQty > 0 && matchesBarcode(item, barcode),
  );
}

export function resolveScanRequirements(
  session: ScanSession,
  barcode: string,
  opts?: { lotNo?: string | null; serialNo?: string | null },
): ScanRequirements | null {
  const candidates = findOpenCandidates(session, barcode);
  if (!candidates.length) return null;

  if (opts?.serialNo?.trim()) {
    return {
      needsLot: false,
      needsSerial: false,
      candidates,
      goodsCode: candidates[0].goodsCode || candidates[0].skuCode,
      skuName: candidates[0].skuName,
    };
  }
  if (opts?.lotNo?.trim()) {
    return {
      needsLot: false,
      needsSerial: false,
      candidates,
      goodsCode: candidates[0].goodsCode || candidates[0].skuCode,
      skuName: candidates[0].skuName,
    };
  }

  const needsSerial = candidates.some(itemNeedsSerialCapture);
  const needsLot = !needsSerial && candidates.some(itemNeedsLotCapture);

  return {
    needsLot,
    needsSerial,
    candidates,
    goodsCode: candidates[0].goodsCode || candidates[0].skuCode,
    skuName: candidates[0].skuName,
  };
}

export function collectUsedSerials(session: ScanSession) {
  const serials = new Set<string>();
  for (const item of session.items) {
    if (item.scanQty > 0 && item.serialNo?.trim()) {
      serials.add(item.serialNo.trim().toUpperCase());
    }
  }
  return serials;
}

export function isSerialUsed(session: ScanSession, serialNo: string) {
  return collectUsedSerials(session).has(serialNo.trim().toUpperCase());
}

export function validateSerialForScan(
  session: ScanSession,
  goodsCode: string,
  serialNo: string,
) {
  const serial = serialNo.trim();
  if (!serial) return { ok: false as const, message: 'SERIAL_REQUIRED' };
  if (isSerialUsed(session, serial)) return { ok: false as const, message: 'SERIAL_DUPLICATE' };

  const candidates = findOpenCandidates(session, goodsCode).filter((item) =>
    itemRequiresSerial(item),
  );
  if (!candidates.length) return { ok: true as const };

  const presetLines = candidates.filter((item) => item.serialNo?.trim());
  if (presetLines.length) {
    const allowed = presetLines.some(
      (item) => item.serialNo!.trim().toUpperCase() === serial.toUpperCase(),
    );
    if (!allowed) return { ok: false as const, message: 'SERIAL_NOT_IN_DOC' };
  }

  const stockSerials = session.serialStock?.[goodsCode];
  if (stockSerials?.length) {
    const inStock = stockSerials.some(
      (value) => value.trim().toUpperCase() === serial.toUpperCase(),
    );
    if (!inStock) return { ok: false as const, message: 'SERIAL_NOT_IN_STOCK' };
  }

  return { ok: true as const };
}

export function getAvailableLots(
  session: ScanSession,
  goodsCode: string,
): WarehouseLotOption[] {
  const fromSession = session.lotStock?.filter(
    (lot) => lot.goodsCode === goodsCode && lot.qtyOnHand > 0,
  );
  if (fromSession?.length) return sortLots([...fromSession], getLotPolicy());

  const map = new Map<string, WarehouseLotOption>();
  for (const item of session.items) {
    if (item.goodsCode !== goodsCode && item.skuCode !== goodsCode) continue;
    const lotNo = item.lotNo?.trim();
    if (!lotNo) continue;

    const existing = map.get(lotNo);
    if (!existing) {
      map.set(lotNo, {
        lotNo,
        goodsCode,
        qtyOnHand: Math.max(0, item.remainingQty),
        mfgDate: item.mfgDate ?? undefined,
        expDate: item.expDate ?? undefined,
      });
      continue;
    }

    existing.qtyOnHand += Math.max(0, item.remainingQty);
    if (!existing.mfgDate && item.mfgDate) existing.mfgDate = item.mfgDate;
    if (!existing.expDate && item.expDate) existing.expDate = item.expDate;
  }

  return sortLots([...map.values()], getLotPolicy());
}

export function sortLots(lots: WarehouseLotOption[], policy: LotPolicy) {
  const sorted = [...lots];
  sorted.sort((a, b) => {
    if (policy === 'FEFO') {
      const expCmp = (a.expDate ?? '9999-99-99').localeCompare(b.expDate ?? '9999-99-99');
      if (expCmp !== 0) return expCmp;
    } else {
      const mfgCmp = (a.mfgDate ?? '9999-99-99').localeCompare(b.mfgDate ?? '9999-99-99');
      if (mfgCmp !== 0) return mfgCmp;
    }
    return a.lotNo.localeCompare(b.lotNo, undefined, { numeric: true });
  });
  return sorted;
}

export function getLotBalance(session: ScanSession, goodsCode: string, lotNo: string) {
  const lots = getAvailableLots(session, goodsCode);
  return lots.find((lot) => lot.lotNo === lotNo)?.qtyOnHand ?? 0;
}

export function validateLotForScan(
  session: ScanSession,
  goodsCode: string,
  lotNo: string,
  qty: number,
) {
  const lot = lotNo.trim();
  if (!lot) return { ok: false as const, message: 'LOT_REQUIRED' };

  const balance = getLotBalance(session, goodsCode, lot);
  if (balance <= 0) return { ok: false as const, message: 'LOT_NOT_FOUND' };
  if (balance < qty) return { ok: false as const, message: 'LOT_INSUFFICIENT' };

  const candidates = findOpenCandidates(session, goodsCode).filter((item) =>
    itemRequiresLot(item),
  );
  const presetLines = candidates.filter((item) => item.lotNo?.trim());
  if (presetLines.length) {
    const allowed = presetLines.some((item) => item.lotNo!.trim() === lot);
    if (!allowed) return { ok: false as const, message: 'LOT_NOT_IN_DOC' };
  }

  return { ok: true as const };
}

export function mapRequiresFlags(row: Record<string, string>) {
  return {
    requiresSerial:
      isTruthy(row.GOODS_USE_SERIAL) ||
      isTruthy(row.SKU_USE_SERIAL) ||
      isTruthy(row.TRD_USE_SERIAL) ||
      isTruthy(row.GOODS_SERIAL) ||
      isTruthy(row.SKU_SERIAL),
    requiresLot:
      isTruthy(row.GOODS_USE_LOT) ||
      isTruthy(row.SKU_USE_LOT) ||
      isTruthy(row.TRD_USE_LOT) ||
      isTruthy(row.GOODS_LOT) ||
      isTruthy(row.SKU_LOT) ||
      Boolean(row.TRD_LOT_NO?.trim()),
    mfgDate: row.TRD_MFG_DATE?.trim() || row.LOT_MFG_DATE?.trim() || null,
    expDate: row.TRD_EXP_DATE?.trim() || row.LOT_EXP_DATE?.trim() || null,
  };
}

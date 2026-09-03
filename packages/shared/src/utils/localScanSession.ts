import type { ScanSession, ScanSessionItem } from '../api/client';
import { ErpError } from '../api/erpClient';
import { th } from '../text/th';
import {
  compareDocumentsForPacking,
  documentsForParty,
  isPartyFullyScanned,
  remainingPartyCodes,
  validatePackingDocumentComplete,
  validatePackingPartyComplete,
} from './packingSessionUtils';

function documentMap(session: ScanSession) {
  return new Map(session.documents.map((doc) => [doc.diKey, doc]));
}

function partyOfItem(session: ScanSession, item: ScanSessionItem) {
  return documentMap(session).get(item.sourceDiKey)?.partyCode ?? '';
}

function formatPartyLabel(doc?: ScanSession['documents'][number]) {
  if (!doc?.partyCode) return th.sessionErrors.unknownParty;
  return doc.partyName ? `${doc.partyCode} â€” ${doc.partyName}` : doc.partyCode;
}

function compareItemsForScan(
  session: ScanSession,
  a: ScanSessionItem,
  b: ScanSessionItem,
) {
  const skuCmp = a.skuCode.localeCompare(b.skuCode, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (skuCmp !== 0) return skuCmp;

  const goodsCmp = a.goodsCode.localeCompare(b.goodsCode, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (goodsCmp !== 0) return goodsCmp;

  const docMap = documentMap(session);
  const docA = docMap.get(a.sourceDiKey);
  const docB = docMap.get(b.sourceDiKey);
  if (docA && docB) {
    const docCmp = compareDocumentsForPacking(docA, docB);
    if (docCmp !== 0) return docCmp;
  }
  return a.sourceTrdKey - b.sourceTrdKey;
}

function boxTotals(session: ScanSession, boxNo: number) {
  const items = session.items.filter((i) => i.boxNo === boxNo && i.scanQty > 0);
  return {
    totalQty: items.reduce((sum, i) => sum + i.scanQty, 0),
    totalWeight: items.reduce((sum, i) => sum + i.unitWeight * i.scanQty, 0),
  };
}

function collectDocumentsInBox(
  session: ScanSession,
  boxItems: ScanSessionItem[],
) {
  const diKeys = new Set(
    boxItems.filter((item) => item.scanQty > 0).map((item) => item.sourceDiKey),
  );
  const docs = session.documents
    .filter((doc) => diKeys.has(doc.diKey))
    .sort((a, b) =>
      a.diRef.localeCompare(b.diRef, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
  return {
    documentKeys: docs.map((doc) => doc.diKey),
    documentRefs: docs.map((doc) => doc.diRef),
  };
}

function cloneSession(session: ScanSession): ScanSession {
  return structuredClone(session);
}

export function localScan(
  session: ScanSession,
  dto: {
    barcode: string;
    multiplier?: number;
    boxNo?: number;
    weightGrams?: number;
    lotNo?: string;
    serialNo?: string;
  },
) {
  const next = cloneSession(session);
  if (next.status !== 'open') {
    throw new ErpError(th.sessionErrors.closed);
  }

  const docMap = documentMap(next);
  const boxNo = dto.boxNo ?? next.currentBoxNo;
  const multiplier = dto.serialNo ? 1 : (dto.multiplier ?? 1);
  let remainingToAllocate = multiplier;

  let candidates = next.items
    .filter(
      (item) =>
        item.remainingQty > 0 &&
        (item.goodsCode === dto.barcode || item.skuCode === dto.barcode),
    )
    .sort((a, b) => compareItemsForScan(next, a, b));

  if (dto.lotNo?.trim()) {
    const lot = dto.lotNo.trim();
    const withLot = candidates.filter(
      (item) => !item.lotNo?.trim() || item.lotNo.trim() === lot,
    );
    if (withLot.length) candidates = withLot;
  }

  if (dto.serialNo?.trim()) {
    const serial = dto.serialNo.trim();
    const withSerial = candidates.filter(
      (item) => !item.serialNo?.trim() || item.serialNo.trim() === serial,
    );
    if (withSerial.length) candidates = withSerial;
  }

  if (candidates.length === 0) {
    throw new ErpError(th.sessionErrors.barcodeNotFound(dto.barcode));
  }

  // Packing List: à¸ÿà¸³à¸ÿà¸±à¸”à¹€à¸ÿà¸ÿà¸²à¸°à¸¥à¸¹à¸ÿà¸ÿà¹ÿà¸²à¸—à¸µà¹ÿà¸ÿà¸³à¸¥à¸±à¸ÿà¸ÿà¸±à¸” (à¸—à¸¸à¸ÿà¸£à¸²à¸¢à¸ÿà¸²à¸£à¸—à¸¸à¸ÿà¹€à¸­à¸ÿà¸ªà¸²à¸£à¸ÿà¸­à¸ÿà¸¥à¸¹à¸ÿà¸ÿà¹ÿà¸²)
  if (
    next.module === 'PackingList' &&
    next.activePartyCode != null &&
    next.activePartyCode !== ''
  ) {
    const sameParty = candidates.filter(
      (item) => partyOfItem(next, item) === next.activePartyCode,
    );
    if (sameParty.length === 0) {
      const activeDoc = next.documents.find(
        (doc) => doc.partyCode === next.activePartyCode,
      );
      const scannedDoc = docMap.get(candidates[0].sourceDiKey);
      throw new ErpError(
        th.sessionErrors.wrongCustomer(
          formatPartyLabel(scannedDoc),
          formatPartyLabel(activeDoc),
        ),
      );
    }
    candidates = sameParty;
  } else if (next.activeDiKey != null) {
    const activeDoc = docMap.get(next.activeDiKey);
    const sameDocument = candidates.filter(
      (item) => item.sourceDiKey === next.activeDiKey,
    );
    if (sameDocument.length === 0) {
      const scannedDoc = docMap.get(candidates[0].sourceDiKey);
      throw new ErpError(
        th.sessionErrors.wrongDocument(
          scannedDoc?.diRef ?? '-',
          activeDoc?.diRef ?? '-',
        ),
      );
    }
    candidates = sameDocument;
  }

  const available = candidates.reduce((sum, i) => sum + i.remainingQty, 0);
  if (available < remainingToAllocate) {
    throw new ErpError(
      th.sessionErrors.qtyExceeds(remainingToAllocate, available),
    );
  }

  const historyEntries: ScanSession['scanHistory'] = [];
  const unitWeightOverride =
    dto.weightGrams != null && dto.weightGrams > 0
      ? dto.weightGrams / multiplier
      : null;

  for (const item of candidates) {
    if (remainingToAllocate <= 0) break;
    const take = Math.min(item.remainingQty, remainingToAllocate);
    item.scanQty += take;
    item.remainingQty -= take;
    remainingToAllocate -= take;

    if (take > 0) {
      if (unitWeightOverride != null) {
        item.unitWeight = unitWeightOverride;
      }
      if (dto.lotNo?.trim()) item.lotNo = dto.lotNo.trim();
      if (dto.serialNo?.trim()) item.serialNo = dto.serialNo.trim();
      historyEntries.push({
        itemId: item.itemId,
        boxNo,
        qty: take,
        barcode: dto.barcode,
        at: new Date().toISOString(),
      });
    }

    if (item.remainingQty === 0) {
      item.boxNo = boxNo;
      item.seq = next.items.filter((i) => i.boxNo === boxNo).length;
    }
  }

  next.currentBoxNo = boxNo;
  next.scanHistory = [...(next.scanHistory ?? []), ...historyEntries].slice(-50);

  return { session: next, currentBoxNo: next.currentBoxNo };
}

export function localCloseBox(
  session: ScanSession,
  boxNo = session.currentBoxNo,
) {
  const next = cloneSession(session);
  const boxItems = next.items.filter((item) => item.boxNo === boxNo);

  if (boxItems.length === 0) {
    throw new ErpError(th.sessionErrors.emptyBox(boxNo));
  }

  const partyMode =
    next.module === 'PackingList' &&
    next.activePartyCode != null &&
    next.activePartyCode !== '';

  if (partyMode) {
    if (!isPartyFullyScanned(next, next.activePartyCode)) {
      throw new ErpError(th.sessionErrors.closeBoxPartyIncomplete);
    }
  }

  const partyDiKeys = partyMode
    ? new Set(
        documentsForParty(next, next.activePartyCode).map((doc) => doc.diKey),
      )
    : null;

  const partial = next.items.some((item) => {
    if (partyDiKeys) {
      if (!partyDiKeys.has(item.sourceDiKey)) return false;
    } else if (next.activeDiKey != null) {
      if (item.sourceDiKey !== next.activeDiKey) return false;
    }
    return item.scanQty > 0 && item.remainingQty > 0 && item.boxNo === 0;
  });
  if (partial) {
    throw new ErpError(th.sessionErrors.closeBoxPartial);
  }

  const totals = boxTotals(next, boxNo);
  const boxDocuments = collectDocumentsInBox(next, boxItems);
  const existing = next.boxes.find((box) => box.boxNo === boxNo);
  if (existing) {
    existing.itemCount = boxItems.length;
    existing.totalQty = totals.totalQty;
    existing.totalWeight = totals.totalWeight;
    existing.closedAt = new Date().toISOString();
    existing.documentKeys = boxDocuments.documentKeys;
    existing.documentRefs = boxDocuments.documentRefs;
  } else {
    next.boxes.push({
      boxNo,
      itemCount: boxItems.length,
      totalQty: totals.totalQty,
      totalWeight: totals.totalWeight,
      closedAt: new Date().toISOString(),
      documentKeys: boxDocuments.documentKeys,
      documentRefs: boxDocuments.documentRefs,
    });
  }

  next.currentBoxNo = boxNo + 1;
  return {
    session: next,
    closedBoxNo: boxNo,
    nextBoxNo: next.currentBoxNo,
  };
}


export function localUndoLastScan(session: ScanSession) {
  const next = cloneSession(session);
  const history = [...(next.scanHistory ?? [])];
  const last = history.pop();
  if (!last) {
    throw new ErpError(th.sessionErrors.noUndo);
  }

  const item = next.items.find((i) => i.itemId === last.itemId);
  if (!item) {
    throw new ErpError(th.sessionErrors.undoTargetMissing);
  }

  item.scanQty = Math.max(0, item.scanQty - last.qty);
  item.remainingQty += last.qty;
  if (item.remainingQty > 0) {
    item.boxNo = 0;
  }

  next.scanHistory = history;
  return { session: next };
}

export function localRemoveItemFromBox(
  session: ScanSession,
  itemId: string,
) {
  const next = cloneSession(session);
  const item = next.items.find((i) => i.itemId === itemId);
  if (!item || item.scanQty <= 0) {
    throw new ErpError(th.sessionErrors.boxItemMissing);
  }

  const qty = item.scanQty;
  item.scanQty = 0;
  item.remainingQty += qty;
  item.boxNo = 0;
  item.seq = 999999999;
  return { session: next };
}

export function localConfirmNextPackingDocument(session: ScanSession) {
  const next = cloneSession(session);
  if (next.status !== 'open') {
    throw new ErpError(th.sessionErrors.closed);
  }

  const partyMode =
    next.activePartyCode != null && next.activePartyCode !== '';

  if (partyMode) {
    const currentParty = next.activePartyCode!;
    const validationMessage = validatePackingPartyComplete(next, currentParty);
    if (validationMessage) {
      throw new ErpError(validationMessage);
    }

    const partyDocs = documentsForParty(next, currentParty);
    if (!partyDocs.length) {
      throw new ErpError(th.sessionErrors.noPartyDocs);
    }

    const confirmed = new Set(next.confirmedDiKeys ?? []);
    for (const doc of partyDocs) confirmed.add(doc.diKey);
    next.confirmedDiKeys = [...confirmed];
    next.lastConfirmedDiKey = partyDocs[partyDocs.length - 1]?.diKey ?? null;

    const remaining = remainingPartyCodes(next);
    if (!remaining.length) {
      next.activeDiKey = null;
      return {
        session: next,
        document: partyDocs[0],
        isLastDocument: true as const,
      };
    }

    const nextParty = remaining[0];
    const nextDocs = documentsForParty(next, nextParty);
    next.activePartyCode = nextParty;
    next.activeDiKey = null;

    return {
      session: next,
      document: nextDocs[0] ?? partyDocs[0],
      isLastDocument: false as const,
    };
  }

  if (next.activeDiKey == null) {
    throw new ErpError(th.sessionErrors.noActiveDoc);
  }

  const docs = [...next.documents].sort(compareDocumentsForPacking);
  if (!docs.length) {
    throw new ErpError(th.sessionErrors.noDocuments);
  }

  const currentDiKey = next.activeDiKey;
  const validationMessage = validatePackingDocumentComplete(next, currentDiKey);
  if (validationMessage) {
    throw new ErpError(validationMessage);
  }

  const confirmed = new Set(next.confirmedDiKeys ?? []);
  confirmed.add(currentDiKey);

  const currentIndex = docs.findIndex((doc) => doc.diKey === currentDiKey);
  if (currentIndex < 0) {
    throw new ErpError(th.sessionErrors.activeDocMissing);
  }

  next.confirmedDiKeys = [...confirmed];
  next.lastConfirmedDiKey = currentDiKey;

  if (currentIndex >= docs.length - 1) {
    return {
      session: next,
      document: docs[currentIndex],
      isLastDocument: true as const,
    };
  }

  const document = docs[currentIndex + 1];
  next.activeDiKey = document.diKey;
  next.activePartyCode = document.partyCode ?? next.activePartyCode;

  return {
    session: next,
    document,
    isLastDocument: false as const,
  };
}

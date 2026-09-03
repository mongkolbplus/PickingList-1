import type { ScanSession, ScanSessionItem } from '../api/client';
import { th } from '../text/th';

export function compareDocumentsByRef(
  a: ScanSession['documents'][number],
  b: ScanSession['documents'][number],
) {
  return a.diRef.localeCompare(b.diRef, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/** เรียงเอกสาร: รหัสลูกหนี้น้อยสุด → วันที่ → เลขที่ */
export function compareDocumentsForPacking(
  a: ScanSession['documents'][number],
  b: ScanSession['documents'][number],
) {
  const partyCmp = (a.partyCode ?? '').localeCompare(b.partyCode ?? '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (partyCmp !== 0) return partyCmp;

  const dateCmp = a.diDate.localeCompare(b.diDate);
  if (dateCmp !== 0) return dateCmp;

  return compareDocumentsByRef(a, b);
}

export function sortDocumentsByRef(
  documents: ScanSession['documents'],
) {
  return [...documents].sort(compareDocumentsByRef);
}

export function sortDocumentsForPacking(
  documents: ScanSession['documents'],
) {
  return [...documents].sort(compareDocumentsForPacking);
}

export function preparePackingSession(session: ScanSession): ScanSession {
  if (session.module !== 'PackingList') return session;

  const documents = sortDocumentsForPacking(session.documents);
  const first = documents[0];
  const activePartyCode = first?.partyCode ?? null;

  // ทำงานทีละลูกค้า: ไม่ล็อก activeDiKey เพื่อแสดงทุกรายการของลูกค้ารายแรก
  return {
    ...session,
    documents,
    activeDiKey: null,
    activePartyCode,
    confirmedDiKeys: [],
    lastConfirmedDiKey: null,
  };
}

/** เอกสารตัวแทนของลูกค้าที่กำลังจัด (รหัสน้อยสุดในกลุ่ม) */
export function activeDocumentRef(session: ScanSession) {
  if (session.activeDiKey != null) {
    return (
      session.documents.find((doc) => doc.diKey === session.activeDiKey) ?? null
    );
  }
  if (session.activePartyCode != null && session.activePartyCode !== '') {
    return (
      documentsForParty(session, session.activePartyCode)[0] ?? null
    );
  }
  return session.documents[0] ?? null;
}

export function documentsForParty(
  session: ScanSession,
  partyCode: string | null | undefined,
) {
  if (partyCode == null || partyCode === '') return [];
  return sortDocumentsForPacking(
    session.documents.filter((doc) => (doc.partyCode ?? '') === partyCode),
  );
}

export function itemsForParty(
  session: ScanSession,
  partyCode: string | null | undefined,
): ScanSessionItem[] {
  if (partyCode == null || partyCode === '') return [];
  const diKeys = new Set(
    documentsForParty(session, partyCode).map((doc) => doc.diKey),
  );
  return session.items.filter((item) => diKeys.has(item.sourceDiKey));
}

export function itemsForActiveScope(session: ScanSession): ScanSessionItem[] {
  if (session.module !== 'PackingList') return session.items;

  if (session.activePartyCode != null && session.activePartyCode !== '') {
    return itemsForParty(session, session.activePartyCode);
  }
  if (session.activeDiKey != null) {
    return session.items.filter(
      (item) => item.sourceDiKey === session.activeDiKey,
    );
  }
  return session.items;
}

export function itemsForActiveDocument(session: ScanSession): ScanSessionItem[] {
  return itemsForActiveScope(session);
}

export function getClosedBoxNosForDocument(
  session: ScanSession,
  diKey: number,
) {
  const boxNos = new Set<number>();
  for (const item of session.items) {
    if (item.sourceDiKey === diKey && item.boxNo > 0 && item.scanQty > 0) {
      boxNos.add(item.boxNo);
    }
  }

  return [...boxNos]
    .filter((boxNo) =>
      session.boxes.some((box) => box.boxNo === boxNo && box.closedAt),
    )
    .sort((a, b) => a - b);
}

/** กล่องที่พิมพ์ได้ — ใช้กล่องที่ปิดแล้วก่อน หรือกล่องที่มีสินค้าสแกนแล้ว */
export function getAvailableBoxNosForDocument(
  session: ScanSession,
  diKey: number,
) {
  const closed = getClosedBoxNosForDocument(session, diKey);
  if (closed.length) return closed;

  const boxNos = new Set<number>();
  for (const item of session.items) {
    if (item.sourceDiKey === diKey && item.boxNo > 0 && item.scanQty > 0) {
      boxNos.add(item.boxNo);
    }
  }
  return [...boxNos].sort((a, b) => a - b);
}

/** กล่องที่พิมพ์ได้ทั้ง session (ไม่แยกเอกสาร) */
export function getAvailableBoxNos(session: ScanSession) {
  const closed = session.boxes
    .filter((box) => box.closedAt)
    .map((box) => box.boxNo)
    .sort((a, b) => a - b);
  if (closed.length) return closed;

  const boxNos = new Set<number>();
  for (const item of session.items) {
    if (item.boxNo > 0 && item.scanQty > 0) boxNos.add(item.boxNo);
  }
  return [...boxNos].sort((a, b) => a - b);
}

export function documentHasUnclosedBoxes(
  session: ScanSession,
  diKey: number,
) {
  const boxNos = new Set<number>();
  for (const item of session.items) {
    if (item.sourceDiKey === diKey && item.boxNo > 0 && item.scanQty > 0) {
      boxNos.add(item.boxNo);
    }
  }

  for (const boxNo of boxNos) {
    const box = session.boxes.find((entry) => entry.boxNo === boxNo);
    if (!box?.closedAt) return true;
  }

  return false;
}

export function isDocumentFullyScanned(
  session: ScanSession,
  diKey: number,
) {
  const docItems = session.items.filter((item) => item.sourceDiKey === diKey);
  if (!docItems.length) return false;

  if (docItems.some((item) => item.remainingQty > 0)) return false;

  return !docItems.some(
    (item) => item.scanQty > 0 && item.remainingQty > 0 && item.boxNo === 0,
  );
}

export function isPartyFullyScanned(
  session: ScanSession,
  partyCode: string | null | undefined,
) {
  const items = itemsForParty(session, partyCode);
  if (!items.length) return false;
  if (items.some((item) => item.remainingQty > 0)) return false;
  return !items.some(
    (item) => item.scanQty > 0 && item.remainingQty > 0 && item.boxNo === 0,
  );
}

export function partyHasUnclosedBoxes(
  session: ScanSession,
  partyCode: string | null | undefined,
) {
  const items = itemsForParty(session, partyCode);
  const boxNos = new Set<number>();
  for (const item of items) {
    if (item.boxNo > 0 && item.scanQty > 0) boxNos.add(item.boxNo);
  }
  for (const boxNo of boxNos) {
    const box = session.boxes.find((entry) => entry.boxNo === boxNo);
    if (!box?.closedAt) return true;
  }
  return false;
}

export function hasScannedItemsForDocument(
  session: ScanSession,
  diKey: number,
) {
  return session.items.some(
    (item) => item.sourceDiKey === diKey && item.scanQty > 0,
  );
}

export function hasScannedItemsForParty(
  session: ScanSession,
  partyCode: string | null | undefined,
) {
  return itemsForParty(session, partyCode).some((item) => item.scanQty > 0);
}

/** สแกนครบ + ปิดกล่องครบของลูกค้าที่กำลังจัด — พร้อมลูกค้า/เอกสารถัดไป */
export function canFinalizeActivePackingDocument(session: ScanSession) {
  if (session.module !== 'PackingList') return false;

  if (session.activePartyCode != null && session.activePartyCode !== '') {
    const partyCode = session.activePartyCode;
    if (!hasScannedItemsForParty(session, partyCode)) return false;
    if (!isPartyFullyScanned(session, partyCode)) return false;
    if (partyHasUnclosedBoxes(session, partyCode)) return false;
    return true;
  }

  if (session.activeDiKey == null) return false;
  const diKey = session.activeDiKey;
  if (!hasScannedItemsForDocument(session, diKey)) return false;
  if (!isDocumentFullyScanned(session, diKey)) return false;
  if (documentHasUnclosedBoxes(session, diKey)) return false;
  return true;
}

export function canPrintPackingDocumentActions(session: ScanSession) {
  return canFinalizeActivePackingDocument(session);
}

export function canCheckNextPackingDocument(session: ScanSession) {
  return canFinalizeActivePackingDocument(session);
}

export function resolvePackingPrintDiKey(session: ScanSession): number | null {
  const candidates: number[] = [];

  if (session.activeDiKey != null) candidates.push(session.activeDiKey);
  if (session.lastConfirmedDiKey != null) {
    candidates.push(session.lastConfirmedDiKey);
  }
  if (session.activePartyCode) {
    for (const doc of documentsForParty(session, session.activePartyCode)) {
      candidates.push(doc.diKey);
    }
  }
  for (const doc of session.documents) {
    candidates.push(doc.diKey);
  }

  const seen = new Set<number>();
  for (const diKey of candidates) {
    if (seen.has(diKey)) continue;
    seen.add(diKey);
    if (
      getAvailableBoxNosForDocument(session, diKey).length ||
      hasScannedItemsForDocument(session, diKey)
    ) {
      return diKey;
    }
  }

  return session.documents[0]?.diKey ?? null;
}

export function validatePackingDocumentComplete(
  session: ScanSession,
  diKey: number,
) {
  const doc = session.documents.find((entry) => entry.diKey === diKey);

  if (!session.items.some((item) => item.sourceDiKey === diKey)) {
    return th.sessionErrors.docItemsMissing(doc?.diRef ?? diKey);
  }

  if (!isDocumentFullyScanned(session, diKey)) {
    return th.sessionErrors.scanIncomplete;
  }

  if (documentHasUnclosedBoxes(session, diKey)) {
    return th.sessionErrors.boxesOpen;
  }

  return null;
}

export function validatePackingPartyComplete(
  session: ScanSession,
  partyCode: string,
) {
  const docs = documentsForParty(session, partyCode);
  if (!docs.length) {
    return th.sessionErrors.partyDocsMissing(partyCode);
  }

  if (!isPartyFullyScanned(session, partyCode)) {
    return th.sessionErrors.scanIncomplete;
  }

  if (partyHasUnclosedBoxes(session, partyCode)) {
    return th.sessionErrors.boxesOpen;
  }

  return null;
}

/** รหัสลูกหนี้ที่ยังไม่ได้ยืนยันครบ เรียงรหัสน้อย → มาก */
export function remainingPartyCodes(session: ScanSession): string[] {
  const confirmed = new Set(session.confirmedDiKeys ?? []);
  const codes = new Set<string>();
  for (const doc of sortDocumentsForPacking(session.documents)) {
    const code = doc.partyCode ?? '';
    if (!code) continue;
    const partyDocs = documentsForParty(session, code);
    if (partyDocs.every((d) => confirmed.has(d.diKey))) continue;
    codes.add(code);
  }
  return [...codes].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

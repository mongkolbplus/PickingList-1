import type { ScanSession } from '../api/client';

const STATUS_PENDING = '\u0e23\u0e2d\u0e2a\u0e41\u0e01\u0e19' as const;
const STATUS_PARTIAL = '\u0e2a\u0e41\u0e01\u0e19\u0e1a\u0e32\u0e07\u0e2a\u0e48\u0e27\u0e19' as const;
const STATUS_DONE = '\u0e04\u0e23\u0e1a\u0e41\u0e25\u0e49\u0e27' as const;

export type ItemLineStatus =
  | typeof STATUS_PENDING
  | typeof STATUS_PARTIAL
  | typeof STATUS_DONE;

export interface AggregatedItemLine {
  lineKey: string;
  sourceDiKey: number;
  sourceDiDate: string;
  sourcePartyCode: string;
  sourceDiRef: string;
  skuCode: string;
  barcode: string;
  skuName: string;
  unitName: string;
  packSize: number;
  documentQty: number;
  scanQty: number;
  remainingQty: number;
  status: ItemLineStatus;
}

export function itemLineStatus(
  scanQty: number,
  remainingQty: number,
): ItemLineStatus {
  if (remainingQty <= 0) return STATUS_DONE;
  if (scanQty > 0) return STATUS_PARTIAL;
  return STATUS_PENDING;
}

export function statusBadgeTone(
  status: ItemLineStatus,
): 'done' | 'partial' | 'pending' {
  if (status === STATUS_DONE) return 'done';
  if (status === STATUS_PARTIAL) return 'partial';
  return 'pending';
}

function compareItemLines(a: AggregatedItemLine, b: AggregatedItemLine) {
  const skuCmp = a.skuCode.localeCompare(b.skuCode, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (skuCmp !== 0) return skuCmp;

  const barcodeCmp = a.barcode.localeCompare(b.barcode, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (barcodeCmp !== 0) return barcodeCmp;

  return a.sourceDiRef.localeCompare(b.sourceDiRef, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function aggregateSessionItems(session: ScanSession): AggregatedItemLine[] {
  const docMeta = new Map(
    session.documents.map((doc) => [
      doc.diKey,
      {
        diDate: doc.diDate,
        diRef: doc.diRef,
        partyCode: doc.partyCode ?? '',
      },
    ]),
  );

  // Packing List: show lines for active customer party (activePartyCode)
  const sourceItems =
    session.module === 'PackingList' &&
    session.activePartyCode != null &&
    session.activePartyCode !== ''
      ? session.items.filter((item) => {
          const meta = docMeta.get(item.sourceDiKey);
          return meta?.partyCode === session.activePartyCode;
        })
      : session.module === 'PackingList' && session.activeDiKey != null
        ? session.items.filter(
            (item) => item.sourceDiKey === session.activeDiKey,
          )
        : session.items;

  const groups = new Map<string, AggregatedItemLine>();

  for (const item of sourceItems) {
    const meta = docMeta.get(item.sourceDiKey);
    const lineKey = `${item.sourceDiKey}:${item.sourceTrdKey}`;
    const existing = groups.get(lineKey);

    if (!existing) {
      groups.set(lineKey, {
        lineKey,
        sourceDiKey: item.sourceDiKey,
        sourceDiDate: meta?.diDate ?? '',
        sourcePartyCode: meta?.partyCode ?? '',
        sourceDiRef: meta?.diRef ?? '-',
        skuCode: item.skuCode,
        barcode: item.goodsCode,
        skuName: item.skuName,
        unitName: item.unitName,
        packSize: item.unitQty,
        documentQty: item.documentQty,
        scanQty: item.scanQty,
        remainingQty: item.remainingQty,
        status: itemLineStatus(item.scanQty, item.remainingQty),
      });
      continue;
    }

    existing.documentQty += item.documentQty;
    existing.scanQty += item.scanQty;
    existing.remainingQty += item.remainingQty;
    existing.status = itemLineStatus(existing.scanQty, existing.remainingQty);
  }

  return [...groups.values()]
    .filter((line) => line.remainingQty > 0)
    .sort(compareItemLines);
}

export function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

import type { ScanSession, ScanSessionItem } from '../api/client';

export interface PackingScanLine {
  DI_KEY: string;
  TRD_SEQ: string;
  TRD_KEYIN: string;
  TRD_QTY_SCAN: string;
  TRD_BOX: string;
  TRD_LOT_NO?: string;
  TRD_SERIAL?: string;
  TRD_MAN_D?: string;
  TRD_EXP_D?: string;
}

export interface PackingClosePayload {
  ErpUpdFunc: Array<{
    ImpPackingHeader: {
      DI_KEYS: string;
      CHECKER?: string;
      NOTES?: string;
      ALLOW_PARTIAL?: string;
    };
    ImpPackingDetail: PackingScanLine[];
  }>;
}

function scannedRows(session: ScanSession): ScanSessionItem[] {
  return session.items.filter((item) => item.boxNo > 0 && item.scanQty > 0);
}

export function buildPackingClosePayload(
  session: ScanSession,
  meta?: { checkerName?: string; notes?: string; allowPartial?: boolean },
): PackingClosePayload {
  const diKeys = [...new Set(session.documents.map((doc) => doc.diKey))].join(',');
  const lines: PackingScanLine[] = scannedRows(session).map((item) => ({
    DI_KEY: String(item.sourceDiKey),
    TRD_SEQ: String(item.sourceTrdKey),
    TRD_KEYIN: item.goodsCode || item.skuCode,
    TRD_QTY_SCAN: String(item.scanQty),
    TRD_BOX: String(item.boxNo),
    TRD_LOT_NO: item.lotNo?.trim() || '',
    TRD_SERIAL: item.serialNo?.trim() || '',
    TRD_MAN_D: item.mfgDate?.replace(/-/g, '') || '',
    TRD_EXP_D: item.expDate?.replace(/-/g, '') || '',
  }));

  return {
    ErpUpdFunc: [
      {
        ImpPackingHeader: {
          DI_KEYS: diKeys,
          CHECKER: meta?.checkerName ?? '',
          NOTES: meta?.notes ?? '',
          ALLOW_PARTIAL: meta?.allowPartial ? 'Y' : 'N',
        },
        ImpPackingDetail: lines,
      },
    ],
  };
}

export function hasClosedBoxScans(session: ScanSession) {
  return scannedRows(session).length > 0;
}

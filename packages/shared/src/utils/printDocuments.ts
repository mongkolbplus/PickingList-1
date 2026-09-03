import type { OrgContext } from '../types/packing';
import type {
  ScanSession,
  ScanSessionItem,
  ShippingAddress,
} from '../api/client';
import { PRINT_BARCODE_OPTIONS, renderCode39Svg } from './barcodeSvg';
import { formatWeight } from './boxUtils';
import { formatQty } from './scanItemUtils';
import { getClosedBoxNosForDocument } from './packingSessionUtils';
import type { LabelTemplateId, PackingTemplateId } from './printSettings';
import { formatShippingCompanyLine } from './shippingAddressUtils';

export interface PrintDocumentInfo {
  diRef: string;
  diDate: string;
  branch?: string;
  customerName?: string;
  customerCode?: string;
}

export interface BoxLabelPrintData {
  boxNo: number;
  /** à¹€à¸ÿâÿ¬à¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ session */
  sourceBoxNo: number;
  totalBoxes: number;
  document: PrintDocumentInfo;
  /** à¹€à¸ÿâÿ¬à¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâ€”à¹€à¸ÿà¸•à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâÿ¬à¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸’à¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ (1 à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ à¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸—à¹€à¸ÿà¸ÿ à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿâ€ÿ-à¹€à¸ÿà¸ÿà¹€à¸ÿà¸’à¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿâ€ÿ) */
  documentRefLabel: string;
  documentRefs: string[];
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸—à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸…à¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’ */
  customerName: string;
  address: ShippingAddress;
  totalWeight: number;
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸“à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸”à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ */
  totalQty: number;
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’ barcode = à¹€à¸ÿâÿ¬à¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâ€”à¹€à¸ÿà¸•à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâÿ¬à¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸’à¹€à¸ÿà¸ÿ (à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿâ€ÿ-à¹€à¸ÿà¸ÿà¹€à¸ÿà¸’à¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿâ€ÿ) */
  barcodeValue: string;
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸—à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸”à¹€à¸ÿà¸ÿà¹€à¸ÿà¸‘à¹€à¸ÿâ€”à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ (à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ ShippingAddress company/branch) */
  senderCompanyName: string;
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸‘à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸‘à¹€à¸ÿâ€ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹€à¸ÿà¸’à¹€à¸ÿà¸ÿà¹€à¸ÿâ€”à¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ */
  province: string;
  /** à¹€à¸ÿà¸ÿà¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹€à¸ÿà¸’à¹€à¸ÿà¸ÿà¹€à¸ÿâ€”à¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ */
  destinationBranch: string;
  /** à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâ€¢à¹€à¸ÿà¸”à¹€à¸ÿâ€ÿà¹€à¸ÿâ€¢à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿ */
  contactName: string;
  phone: string;
  shipMethod: string;
  /** barcode à¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸‘à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸…à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ */
  boxBarcodeValue: string;
  /** à¹€à¸ÿâ€”à¹€à¸ÿà¸•à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸‘à¹€à¸ÿâ€ÿà¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿâ€¢à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸‘à¹€à¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿà¸ÿà¹€à¸ÿâÿ¬à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ (à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿà¹€à¸ÿà¸’à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿà¸ÿ ShippingAddress) */
  headerAddressLines: string[];
}

/** \ufffd\ufffd\ufffd\u00a7\ufffd\u0162\ufffd\ufffd\ufffd\ufffd\u0361\ufffd\ufffd\ufffd \ufffd\ufffd\ufffd\ufffd\ufffd\u02b4\ufffd\ufffd\ufffd\u01e7\ufffd\u0367\ufffd\ufffd\ufffd\ufffd \ufffd\ufffd\ufffd\ufffd \ufffd\ufffd\u01e7\ufffd\u0367\ufffd\u0634 - \ufffd\ufffd\ufffd\u0634 */
export function formatDocumentRefRange(refs: string[]) {
  const sorted = [...new Set(refs.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
  if (!sorted.length) return '-';
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
}

/** \ufffd\u0162\ufffd\ufffd\ufffd\ufffd\u0361\ufffd\ufffd\u00f7\ufffd\ufffd\ufffd\ufffd\ufffd\u0539\ufffd\ufffd\ufffd\u3e61\ufffd\ufffd\u0367 \ufffd \ufffd\u04a1\ufffd\ufffd\ufffd\ufffd\ufffd\u0175\u0379\ufffd\u0534\ufffd\ufffd\ufffd\u0367 \ufffd\ufffd\ufffd\ufffd derive \ufffd\u04a1\ufffd\ufffd\u00a1\ufffd\ufffd */
export function getDocumentRefsForBox(session: ScanSession, boxNo: number) {
  const box = session.boxes.find((entry) => entry.boxNo === boxNo);
  if (box?.documentRefs?.length) {
    return [...box.documentRefs].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }

  const diKeys = new Set(
    session.items
      .filter((item) => item.boxNo === boxNo && item.scanQty > 0)
      .map((item) => item.sourceDiKey),
  );
  return session.documents
    .filter((doc) => diKeys.has(doc.diKey))
    .map((doc) => doc.diRef)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
}

export interface PackingListLine {
  boxNo: number;
  skuCode: string;
  goodsCode: string;
  skuName: string;
  qty: number;
  unitName: string;
  weight: number;
}

export interface PackingListPrintData {
  /** source box number in session */
  boxNo: number;
  /** display sequence among selected boxes (1-based) */
  displayBoxNo: number;
  document: PrintDocumentInfo;
  address: ShippingAddress;
  totalBoxes: number;
  lines: PackingListLine[];
  totalQty: number;
  packerName?: string;
  checkerName?: string;
}

export type PrintPaperProfile = 'label' | 'a4' | 'letter';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatThaiDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]) + 543;
  return `${match[3]}/${match[2]}/${year}`;
}

function joinAddressParts(parts: Array<string | undefined | null>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' ');
}

/** \ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\u0474\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\u047a\ufffd\ufffd\ufffd\u3ebb\u0421\ufffd\ufffd\u0367 \ufffd \ufffd\ufffd\ufffd\ufffd\ufffd\ufffd company/phone */
export function formatLabelHeaderAddress(address: ShippingAddress): string[] {
  const lines: string[] = [];
  const push = (value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) lines.push(trimmed);
  };

  push(address.line1);
  push(address.line2);
  push(address.line3);
  push(joinAddressParts([address.subDistrict, address.district]));
  push(joinAddressParts([address.province, address.postCode]));

  return lines;
}

function countPackedBoxes(session: ScanSession) {
  const boxNos = new Set<number>();
  for (const item of session.items) {
    if (item.boxNo > 0 && item.scanQty > 0) {
      boxNos.add(item.boxNo);
    }
  }
  return Math.max(boxNos.size, 1);
}

function boxWeight(session: ScanSession, boxNo: number) {
  return session.items
    .filter((item) => item.boxNo === boxNo && item.scanQty > 0)
    .reduce((sum, item) => sum + item.unitWeight * item.scanQty, 0);
}

function boxQty(session: ScanSession, boxNo: number) {
  return session.items
    .filter((item) => item.boxNo === boxNo && item.scanQty > 0)
    .reduce((sum, item) => sum + item.scanQty, 0);
}

function emptyShippingAddress(diKey: number): ShippingAddress {
  return {
    diKey,
    trhKey: 0,
    addbKey: null,
    company: '',
    branch: '',
    brNo: '',
    taxId: '',
    regNo: '',
    passport: '',
    visa: '',
    line1: '',
    line2: '',
    line3: '',
    subDistrict: '',
    district: '',
    province: '',
    postCode: '',
    country: '',
    countryCode: '',
    email: '',
    etaxEmail: '',
    phone: '',
    fax: '',
    shipMethod: '',
  };
}

function activeDocument(session: ScanSession) {
  const doc =
    session.documents.find((entry) => entry.diKey === session.activeDiKey) ??
    session.documents[0];
  return doc;
}

function documentForAddress(session: ScanSession, address: ShippingAddress) {
  return (
    session.documents.find((doc) => doc.diKey === address.diKey) ??
    activeDocument(session)
  );
}

function resolveAddress(session: ScanSession, address?: ShippingAddress | null) {
  if (address) return address;
  const doc = activeDocument(session);
  if (!doc) return null;
  return (
    session.shippingAddresses.find((entry) => entry.diKey === doc.diKey) ??
    session.shippingAddresses[0] ??
    null
  );
}

function scopedPackedItems(session: ScanSession): ScanSessionItem[] {
  const items = session.items.filter(
    (item) => item.boxNo > 0 && item.scanQty > 0,
  );
  if (!session.activePartyCode) return items;
  const docMap = new Map(
    session.documents.map((doc) => [doc.diKey, doc.partyCode ?? '']),
  );
  return items.filter(
    (item) => docMap.get(item.sourceDiKey) === session.activePartyCode,
  );
}

function aggregatePackingLines(items: ScanSessionItem[]): PackingListLine[] {
  const groups = new Map<string, PackingListLine>();

  for (const item of items) {
    const key = `${item.boxNo}:${item.skuCode}:${item.goodsCode}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        boxNo: item.boxNo,
        skuCode: item.skuCode,
        goodsCode: item.goodsCode,
        skuName: item.skuName,
        qty: item.scanQty,
        unitName: item.unitName,
        weight: item.unitWeight * item.scanQty,
      });
      continue;
    }
    existing.qty += item.scanQty;
    existing.weight += item.unitWeight * item.scanQty;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.boxNo !== b.boxNo) return a.boxNo - b.boxNo;
    return a.skuCode.localeCompare(b.skuCode);
  });
}

export function buildBoxLabelPrintDataForDocument(
  session: ScanSession,
  _diKey: number,
  boxNo: number,
  displayBoxNo: number,
  totalBoxes: number,
  org?: OrgContext | null,
): BoxLabelPrintData | null {
  return buildBoxLabelPrintDataForBox(
    session,
    boxNo,
    displayBoxNo,
    totalBoxes,
    org,
  );
}

export function buildBoxLabelPrintDataListForDocument(
  session: ScanSession,
  diKey: number,
  closedBoxNos: number[],
  org?: OrgContext | null,
): BoxLabelPrintData[] {
  const totalBoxes = closedBoxNos.length;
  return closedBoxNos
    .map((boxNo, index) =>
      buildBoxLabelPrintDataForDocument(
        session,
        diKey,
        boxNo,
        index + 1,
        totalBoxes,
        org,
      ),
    )
    .filter((entry): entry is BoxLabelPrintData => entry != null);
}

function resolvePrimaryDocumentForBox(session: ScanSession, boxNo: number) {
  const refs = getDocumentRefsForBox(session, boxNo);
  const box = session.boxes.find((entry) => entry.boxNo === boxNo);
  const keys =
    box?.documentKeys?.length
      ? box.documentKeys
      : session.items
          .filter((item) => item.boxNo === boxNo && item.scanQty > 0)
          .map((item) => item.sourceDiKey);

  const uniqueKeys = [...new Set(keys)];
  const byKey = uniqueKeys
    .map((diKey) => session.documents.find((doc) => doc.diKey === diKey))
    .filter((doc): doc is NonNullable<typeof doc> => !!doc)
    .sort((a, b) =>
      a.diRef.localeCompare(b.diRef, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

  if (byKey[0]) return byKey[0];

  if (refs[0]) {
    return (
      session.documents.find((doc) => doc.diRef === refs[0]) ??
      session.documents[0] ??
      null
    );
  }

  return session.documents[0] ?? null;
}

function primaryDocumentRef(refs: string[]) {
  const sorted = [...refs].filter(Boolean).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
  return sorted[0] ?? '-';
}

function primaryDocumentRefFromLabel(refLabel: string) {
  const trimmed = refLabel.trim();
  if (!trimmed || trimmed === '-') return '-';
  const parts = trimmed.split('-').map((part) => part.trim()).filter(Boolean);
  return parts[0] ?? trimmed;
}

function buildBoxBarcodeValue(documentRef: string, displayBoxNo: number) {
  const ref = documentRef.trim() || '-';
  return `${ref}-B${displayBoxNo}`;
}

/** \ufffd\ufffd\ufffd\u04a7\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\u3ebb\u0421\ufffd\ufffd\u0367\ufffd\ufffd\ufffd session (\ufffd\ufffd\ufffd\ufffd\ufffd\u0162\ufffd\ufffd\ufffd\ufffd\u0361\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd) */
export function buildBoxLabelPrintDataForBox(
  session: ScanSession,
  boxNo: number,
  displayBoxNo: number,
  totalBoxes: number,
  _org?: OrgContext | null,
): BoxLabelPrintData | null {
  // \u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2b\u0e25\u0e31\u0e01 = \u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e0a\u0e48\u0e27\u0e07\u0e02\u0e2d\u0e07\u0e2a\u0e38\u0e14
  const document = resolvePrimaryDocumentForBox(session, boxNo);
  if (!document) return null;

  const address =
    session.shippingAddresses.find((entry) => entry.diKey === document.diKey) ??
    session.shippingAddresses[0] ??
    emptyShippingAddress(document.diKey);

  const documentRefs = getDocumentRefsForBox(session, boxNo);
  const refs = documentRefs.length ? documentRefs : [document.diRef];
  const documentRefLabel = formatDocumentRefRange(refs);
  const customerName =
    document.partyName?.trim() ||
    address.company?.trim() ||
    document.partyCode?.trim() ||
    '-';
  const primaryRef = primaryDocumentRef(refs);
  const contactName =
    address.company?.trim() || document.partyName?.trim() || '-';

  return {
    boxNo: displayBoxNo,
    sourceBoxNo: boxNo,
    totalBoxes,
    document: {
      diRef: documentRefLabel,
      diDate: document.diDate,
      branch: address.branch || document.partyName,
      customerName,
      customerCode: document.partyCode,
    },
    documentRefLabel,
    documentRefs: refs,
    customerName,
    address,
    totalWeight: boxWeight(session, boxNo),
    totalQty: boxQty(session, boxNo),
    barcodeValue: primaryRef,
    senderCompanyName: formatShippingCompanyLine(address) || '-',
    province: address.province?.trim() || '-',
    destinationBranch: address.branch?.trim() || '-',
    contactName,
    phone: address.phone?.trim() || '-',
    shipMethod: address.shipMethod?.trim() || '-',
    boxBarcodeValue: buildBoxBarcodeValue(primaryRef, displayBoxNo),
    headerAddressLines: formatLabelHeaderAddress(address),
  };
}

export function buildBoxLabelPrintDataList(
  session: ScanSession,
  boxNos: number[],
  org?: OrgContext | null,
): BoxLabelPrintData[] {
  const sorted = [...boxNos].sort((a, b) => a - b);
  const totalBoxes = sorted.length;
  return sorted
    .map((boxNo, index) =>
      buildBoxLabelPrintDataForBox(session, boxNo, index + 1, totalBoxes, org),
    )
    .filter((entry): entry is BoxLabelPrintData => entry != null);
}

/** \ufffd\ufffd\ufffd\u04a7\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd Packing List \ufffd\ufffd\ufffd\ufffd\u047a 1 \ufffd\ufffd\ufffd\u0367 */
export function buildPackingListPrintDataForBox(
  session: ScanSession,
  boxNo: number,
): PackingListPrintData | null {
  const items = session.items.filter(
    (item) => item.boxNo === boxNo && item.scanQty > 0,
  );
  if (!items.length) return null;

  const document =
    resolvePrimaryDocumentForBox(session, boxNo) ?? session.documents[0];
  if (!document) return null;

  const address =
    session.shippingAddresses.find((entry) => entry.diKey === document.diKey) ??
    session.shippingAddresses[0] ??
    null;
  if (!address) return null;

  const refs = getDocumentRefsForBox(session, boxNo);
  const documentRefLabel = formatDocumentRefRange(
    refs.length ? refs : [document.diRef],
  );
  const lines = aggregatePackingLines(items);
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  return {
    boxNo,
    displayBoxNo: boxNo,
    document: {
      diRef: documentRefLabel,
      diDate: document.diDate,
      branch: address.branch || document.partyName,
      customerName: document.partyName,
      customerCode: document.partyCode,
    },
    address,
    totalBoxes: 1,
    lines,
    totalQty,
    packerName: session.packerName,
    checkerName: session.checkerName,
  };
}

/** \ufffd\ufffd\ufffd\u04a7 Packing List \ufffd\u00a1 1 \ufffd\ufffd\ufffd\u0367\ufffd\ufffd\ufffd 1 \u1eba\ufffd\ufffd\ufffd\ufffd\ufffd */
export function buildPackingListPrintDataList(
  session: ScanSession,
  boxNos: number[],
): PackingListPrintData[] {
  const sorted = [...boxNos].sort((a, b) => a - b);
  const totalBoxes = sorted.length;
  return sorted
    .map((boxNo, index) => {
      const entry = buildPackingListPrintDataForBox(session, boxNo);
      if (!entry) return null;
      return {
        ...entry,
        displayBoxNo: index + 1,
        totalBoxes,
      };
    })
    .filter((entry): entry is PackingListPrintData => entry != null);
}

export function buildPackingListPrintDataForBoxes(
  session: ScanSession,
  boxNos: number[],
): PackingListPrintData | null {
  return buildPackingListPrintDataList(session, boxNos)[0] ?? null;
}

export function buildBoxLabelPrintData(
  session: ScanSession,
  _address?: ShippingAddress | null,
  boxNo?: number,
  org?: OrgContext | null,
): BoxLabelPrintData | null {
  const targetBoxNo = boxNo ?? session.currentBoxNo;
  const available = session.boxes
    .filter((box) => box.closedAt)
    .map((box) => box.boxNo)
    .sort((a, b) => a - b);
  const totalBoxes = available.length || countPackedBoxes(session);
  const displayBoxNo =
    available.indexOf(targetBoxNo) >= 0
      ? available.indexOf(targetBoxNo) + 1
      : targetBoxNo;
  return buildBoxLabelPrintDataForBox(
    session,
    targetBoxNo,
    displayBoxNo,
    totalBoxes,
    org,
  );
}

function scopedPackedItemsForDocument(
  session: ScanSession,
  diKey: number,
): ScanSessionItem[] {
  const closedBoxNos = new Set(getClosedBoxNosForDocument(session, diKey));
  return session.items.filter(
    (item) =>
      item.sourceDiKey === diKey &&
      item.boxNo > 0 &&
      item.scanQty > 0 &&
      closedBoxNos.has(item.boxNo),
  );
}

export function buildPackingListPrintDataForDocument(
  session: ScanSession,
  diKey: number,
  boxNos?: number[],
): PackingListPrintData | null {
  const document = session.documents.find((entry) => entry.diKey === diKey);
  const address =
    session.shippingAddresses.find((entry) => entry.diKey === diKey) ?? null;
  if (!document || !address) return null;

  const closedBoxNos = getClosedBoxNosForDocument(session, diKey);
  const selected =
    boxNos && boxNos.length
      ? closedBoxNos.filter((boxNo) => boxNos.includes(boxNo))
      : closedBoxNos;

  const selectedSet = new Set(selected);
  const items = scopedPackedItemsForDocument(session, diKey).filter((item) =>
    selectedSet.has(item.boxNo),
  );
  const lines = aggregatePackingLines(items);
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  return {
    boxNo: selected[0] ?? lines[0]?.boxNo ?? 0,
    displayBoxNo: 1,
    document: {
      diRef: document.diRef,
      diDate: document.diDate,
      branch: address.branch || document.partyName,
      customerName: document.partyName,
      customerCode: document.partyCode,
    },
    address,
    totalBoxes: Math.max(selected.length, 1),
    lines,
    totalQty,
    packerName: session.packerName,
    checkerName: session.checkerName,
  };
}

export function buildPackingListPrintData(
  session: ScanSession,
  address?: ShippingAddress | null,
): PackingListPrintData | null {
  const resolvedAddress = resolveAddress(session, address);
  if (!resolvedAddress) return null;

  const document = documentForAddress(session, resolvedAddress);
  if (!document) return null;

  const lines = aggregatePackingLines(scopedPackedItems(session));
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  return {
    boxNo: session.currentBoxNo || lines[0]?.boxNo || 0,
    displayBoxNo: 1,
    document: {
      diRef: document.diRef,
      diDate: document.diDate,
      branch: resolvedAddress.branch || document.partyName,
      customerName: document.partyName,
      customerCode: document.partyCode,
    },
    address: resolvedAddress,
    totalBoxes: countPackedBoxes(session),
    lines,
    totalQty,
    packerName: session.packerName,
    checkerName: session.checkerName,
  };
}

function printStyles(profile: PrintPaperProfile = 'a4') {
  const page =
    profile === 'label'
      ? '@page { size: A4 portrait; margin: 0; }'
      : profile === 'letter'
        ? '@page { size: letter portrait; margin: 0; }'
        : '@page { size: A4 portrait; margin: 12mm; }';
  return `
    ${page}
    body {
      margin: 0;
      font-family: "IBM Plex Sans Thai", "Angsana New", "TH Sarabun New", sans-serif;
      color: #111;
    }
    .print-root { width: 100%; }
    .printer-hint {
      display: none;
    }
    @media screen {
      .printer-hint {
        display: block;
        margin: 8px 12px;
        padding: 8px 10px;
        border: 1px dashed #94a3b8;
        border-radius: 8px;
        color: #475569;
        font-size: 12px;
      }
      .a4-label-page {
        outline: 1px dashed #cbd5e1;
        margin: 0 auto 12px;
        background: #fff;
      }
    }
    @media print {
      .printer-hint {
        display: none !important;
      }
      .pl-letter,
      .a4-label-page {
        outline: none !important;
        margin: 0 !important;
      }
      body {
        margin: 0;
      }
      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

export const LABELS_PER_A4_PAGE = 2;

function labelHintText(printerHint: string) {
  const base =
    '\u0e41\u0e1a\u0e1a\u0e2a\u0e15\u0e34\u0e01\u0e40\u0e01\u0e2d\u0e23\u0e4c A4 2 \u0e43\u0e1a (\u0e1a\u0e19-\u0e25\u0e48\u0e32\u0e07) \u00b7 \u0e01\u0e32\u0e23\u0e1e\u0e34\u0e21\u0e1e\u0e4c Scale 100% \u0e44\u0e21\u0e48\u0e43\u0e2a\u0e48 Fit to page';
  return printerHint ? `${base} \u00b7 ${printerHint}` : base;
}



function packingListHintText(printerHint: string) {
  const base = '\u0e01\u0e32\u0e23\u0e1e\u0e34\u0e21\u0e1e\u0e4c Scale 100% \u0e44\u0e21\u0e48\u0e43\u0e2a\u0e48 Fit to page';
  return printerHint
    ? `${base} \u00b7 \u0e41\u0e19\u0e30\u0e19\u0e33\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e1e\u0e34\u0e21\u0e1e\u0e4c Letter: ${printerHint}`
    : base;
}


export function renderBoxLabelHtml(data: BoxLabelPrintData) {
  return renderBoxLabelsHtml([data]);
}

function chunkLabelPages(dataList: BoxLabelPrintData[], perPage: number) {
  const pages: BoxLabelPrintData[][] = [];
  for (let i = 0; i < dataList.length; i += perPage) {
    pages.push(dataList.slice(i, i + perPage));
  }
  return pages;
}

function renderLabelSlot(data: BoxLabelPrintData | undefined) {
  const sheetHtml = data
    ? renderFormalBoxLabel(data)
    : `<div class="formal-label formal-label--empty"></div>`;
  return `<div class="a4-label-slot">${sheetHtml}</div>`;
}

export function renderBoxLabelsHtml(
  dataList: BoxLabelPrintData[],
  _templateId: LabelTemplateId = 'default',
  printerHint = '',
) {
  if (!dataList.length) {
    throw new Error('\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e43\u0e1a\u0e1b\u0e30\u0e01\u0e25\u0e48\u0e2d\u0e07');
  }

  const perPage = LABELS_PER_A4_PAGE;
  const pages = chunkLabelPages(dataList, perPage)
    .map((pageItems) => {
      const slots = Array.from({ length: perPage }, (_, index) =>
        renderLabelSlot(pageItems[index]),
      );
      return `<div class="a4-label-page a4-label-page--default">
  ${slots.join('\n  ')}  
</div>`;
    })
    .join('');

  const diRef = escapeHtml(dataList[0].documentRefLabel || dataList[0].document.diRef);
  const hint = `<div class="printer-hint">${escapeHtml(
    labelHintText(printerHint),
  )}</div>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>\u0e43\u0e1a\u0e1b\u0e30\u0e01\u0e25\u0e48\u0e2d\u0e07 ${diRef}</title>
  <style>
    ${printStyles('label')}
    ${formalLabelStyles()}
  </style>
</head>
<body>
  ${hint}
  <div class="print-root">
    ${pages}
  </div>
</body>
</html>`;
}

function formalLabelStyles() {
  return `
    .a4-label-page--default {
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      padding: 7mm 8mm 5mm;
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr auto;
      gap: 5mm;
      page-break-after: always;
      break-after: page;
    }
    .a4-label-page--default:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .a4-label-page--default .a4-label-slot {
      width: 100%;
      height: 100%;
      min-height: 0;
    }
    .a4-page-size-note {
      margin: 0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      line-height: 1.2;
    }
    .formal-label {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 1px solid #1e293b;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #fff;
      color: #111;
      font-size: 11.5pt;
      line-height: 1.3;
    }
    .formal-label--empty {
      visibility: hidden;
      border-color: transparent;
    }
    .formal-label__header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4mm;
      padding: 4mm 5mm 3.5mm;
      border-bottom: 1px solid #cbd5e1;
      align-items: start;
    }
    .formal-label__company {
      display: flex;
      gap: 2.5mm;
      align-items: flex-start;
      min-width: 0;
    }
    .formal-label__accent {
      width: 2.5mm;
      min-height: 12mm;
      background: #1e4a8a;
      border-radius: 1px;
      flex-shrink: 0;
      align-self: stretch;
    }
    .formal-label__company-text {
      min-width: 0;
    }
    .formal-label__company h1 {
      margin: 0 0 1.5mm;
      font-size: 19pt;
      font-weight: 700;
      color: #111;
      line-height: 1.25;
      word-break: break-word;
    }
    .formal-label__address {
      margin: 0;
      font-size: 14.5pt;
      line-height: 1.35;
      word-break: break-word;
    }
    .formal-label__barcodes {
      display: flex;
      flex-direction: column;
      gap: 2mm;
      align-items: flex-end;
      flex-shrink: 0;
    }
    .formal-barcode-block {
      display: flex;
      flex-direction: column;
      align-items: left;
      gap: 0.5mm;
    }
    .formal-barcode-block span {
      font-size: 11pt;
      color: #475569;
      white-space: nowrap;
    }
    .formal-barcode-block svg {
      width: auto;
      height: auto;
      max-width: 100%;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .formal-label__body {
      flex: 1;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      min-height: 0;
    }
    .formal-label__left {
      padding: 3mm 4mm 4mm 5mm;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0;
      font-size: 17.5pt;
      line-height: 1.3;
    }
    .formal-info-row {
      display: grid;
      grid-template-columns: 5.5mm 1fr;
      gap: 2.5mm;
      align-items: center;
      padding: 2.2mm 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .formal-info-row:last-child {
      border-bottom: none;
    }
    .formal-info-row__icon {
      width: 5.5mm;
      height: 5.5mm;
      color: #1e4a8a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .formal-info-row__icon svg {
      width: 5.5mm;
      height: 5.5mm;
      display: block;
    }
    .formal-info-row__text {
      font-size: 11.5pt;
      color: #111;
      font-weight: 600;
    }
    .formal-info-row__value {
      font-weight: 600;
      color: #111;
    }
    .formal-label__right {
      padding: 3mm 4mm 4mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      min-width: 0;
    }
    .formal-box-no__label {
      margin: 0;
      font-size: 14pt;
      color: #1e4a8a;
      font-weight: 600;
      text-align: left;
    }
    .formal-box-no__value {
      margin: 1mm 0 2mm;
      text-align: center;
      line-height: 1.1;
    }
    .formal-box-no__prefix {
      font-size: 34pt;
      font-weight: 700;
      color: #1e4a8a;
    }
    .formal-box-no__numbers {
      font-size: 48pt;
      font-weight: 700;
      color: #111;
    }
    .formal-stats {
      margin-top: auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 3mm;
    }
    .formal-stat {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.8mm;
      padding: 0 1mm;
      border-right: 1px solid #e2e8f0;
    }
    .formal-stat:last-child {
      border-right: none;
    }
    .formal-stat__icon {
      width: 7mm;
      height: 7mm;
      color: #1e4a8a;
    }
    .formal-stat__icon svg {
      width: 7mm;
      height: 7mm;
      display: block;
    }
    .formal-stat__label {
      font-size: 12pt;
      color: #64748b;
      line-height: 1.2;
      min-height: 2.4em;
    }
    .formal-stat__number {
      font-size: 22pt;
      font-weight: 700;
      color: #111;
      line-height: 1;
    }
    .formal-stat__unit {
      font-size: 13pt;
      color: #111;
      line-height: 1;
    }
  `;
}

const FORMAL_ICONS = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  building:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M9 11h1M9 15h1M14 7h1M14 11h1M14 15h1"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3h8l4 4v14H8z"/><path d="M16 3v5h5"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  person:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C10 19 5 14 5 7.5a2 2 0 0 1 2-3.5z"/></svg>',
  truck:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M12 4v16M4 8l8 4 8-4"/></svg>',
  boxes:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l6-3 6 3-6 3z"/><path d="M9 7v10l6-3V7"/><path d="M15 10l6-3v6l-6 3z"/></svg>',
  weight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4"/><path d="M6 10h12l-1.5 9H7.5z"/><circle cx="12" cy="7" r="2"/></svg>',
} as const;

function formalInfoRow(
  icon: keyof typeof FORMAL_ICONS,
  label: string,
  value: string,
) {
  return `<div class="formal-info-row">
    <div class="formal-info-row__icon">${FORMAL_ICONS[icon]}</div>
    <div class="formal-info-row__text">
      <span class="formal-info-row__label">${escapeHtml(label)} :</span>
      <span class="formal-info-row__value"> ${escapeHtml(value)}</span>
    </div>
  </div>`;
}

function formalStatBlock(
  icon: keyof typeof FORMAL_ICONS,
  label: string,
  number: string,
  unit: string,
) {
  return `<div class="formal-stat">
    <div class="formal-stat__icon">${FORMAL_ICONS[icon]}</div>
    <div class="formal-stat__label">${escapeHtml(label)}</div>
    <div class="formal-stat__number">${escapeHtml(number)}</div>
    <div class="formal-stat__unit">${escapeHtml(unit)}</div>
  </div>`;
}

function renderFormalBoxLabel(data: BoxLabelPrintData) {
  const company = escapeHtml(data.senderCompanyName || '-');
  const addressHtml = data.headerAddressLines
    .map((line) => `<p class="formal-label__address">${escapeHtml(line)}</p>`)
    .join('');
  const docBarcode = renderCode39Svg(data.barcodeValue, PRINT_BARCODE_OPTIONS);
  const boxBarcode = renderCode39Svg(data.boxBarcodeValue, PRINT_BARCODE_OPTIONS);
  const diDate = formatThaiDate(data.document.diDate);
  const weightNumber = data.totalWeight.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `<div class="formal-label">
    <header class="formal-label__header">
      <div class="formal-label__company">
        <span class="formal-label__accent" aria-hidden="true"></span>
        <div class="formal-label__company-text">
          <h1>${company}</h1>
          ${addressHtml}
        </div>
      </div>
      <div class="formal-label__barcodes">
        <div class="formal-barcode-block">
          <span>\u0e23\u0e2b\u0e31\u0e08\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23</span>
          ${docBarcode}
        </div>
        <div class="formal-barcode-block">
          <span>\u0e23\u0e2b\u0e31\u0e08\u0e01\u0e25\u0e48\u0e2d\u0e07</span>
          ${boxBarcode}
        </div>
      </div>
    </header>
    <div class="formal-label__body">
      <div class="formal-label__left">
        ${formalInfoRow('pin', '\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14', data.province || '-')}
        ${formalInfoRow('building', '\u0e2a\u0e32\u0e02\u0e32', data.destinationBranch || '-')}
        ${formalInfoRow('doc', '\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48', data.documentRefLabel || '-')}
        ${formalInfoRow('calendar', '\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48', diDate)}
        ${formalInfoRow('person', '\u0e1c\u0e39\u0e49\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d', data.contactName || '-')}
        ${formalInfoRow('phone', '\u0e42\u0e17\u0e23\u0e28\u0e31\u0e17\u0e18\u0e4c', data.phone || '-')}
        ${formalInfoRow('truck', '\u0e27\u0e34\u0e18\u0e35\u0e08\u0e31\u0e14\u0e2a\u0e48\u0e07', data.shipMethod || '-')}
      </div>
      <div class="formal-label__right">
        <p class="formal-box-no__label">\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e25\u0e02\u0e01\u0e25\u0e48\u0e2d\u0e07</p>
        <p class="formal-box-no__value">
          <span class="formal-box-no__prefix">\u0e01\u0e25\u0e48\u0e2d\u0e07 </span>
          <span class="formal-box-no__numbers">${data.boxNo} / ${data.totalBoxes}</span>
        </p>
        <div class="formal-stats">
          ${formalStatBlock(
            'box',
            '\u0e08\u0e33\u0e19\u0e27\u0e19\u0e0a\u0e34\u0e49\u0e19\u0e43\u0e19\u0e01\u0e25\u0e48\u0e2d\u0e07',
            formatQty(data.totalQty),
            '\u0e0a\u0e34\u0e49\u0e19',
          )}
          ${formalStatBlock(
            'boxes',
            '\u0e23\u0e27\u0e21\u0e01\u0e25\u0e48\u0e2d\u0e07\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
            String(data.totalBoxes),
            '\u0e01\u0e25\u0e48\u0e2d\u0e07',
          )}
          ${formalStatBlock('weight', '\u0e19\u0e49\u0e33\u0e2b\u0e19\u0e31\u0e01\u0e23\u0e27\u0e21', weightNumber, '\u0e01\u0e23\u0e31\u0e21')}
        </div>
      </div>
    </div>
  </div>`;
}

function packingListTotalWeight(data: PackingListPrintData) {
  return data.lines.reduce((sum, line) => sum + line.weight, 0);
}

function formatPackingListContactLine(address: ShippingAddress) {
  const parts: string[] = [];
  const phone = address.phone?.trim();
  const taxId = address.taxId?.trim();
  if (phone) parts.push(`\u0e42\u0e17\u0e23. ${phone}`);
  if (taxId) parts.push(`\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35 ${taxId}`);
  return parts.join(' | ');
}

function plMetaItem(
  icon: keyof typeof PL_ICONS,
  label: string,
  value: string,
) {
  return `<div class="pl-meta__item">
    <div class="pl-meta__icon">${PL_ICONS[icon]}</div>
    <div class="pl-meta__label">${escapeHtml(label)}</div>
    <div class="pl-meta__value">${escapeHtml(value)}</div>
  </div>`;
}

function packingListBarcodeValue(data: PackingListPrintData) {
  return primaryDocumentRefFromLabel(data.document.diRef);
}

const PL_ICONS = {
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3h8l4 4v14H8z"/><path d="M16 3v5h5"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  building:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M9 11h1M9 15h1M14 7h1M14 11h1M14 15h1"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M12 4v16M4 8l8 4 8-4"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C10 19 5 14 5 7.5a2 2 0 0 1 2-3.5z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
} as const;

function packingListLetterStyles() {
  return `
    .pl-letter {
      width: 100%;
      max-width: 8.5in;
      min-height: calc(11in - 16mm);
      margin: 0 auto;
      box-sizing: border-box;
      padding: 8mm;
      font-size: 10pt;
      line-height: 1.35;
      color: #111;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
    }
    .pl-letter:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .pl-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6mm;
      align-items: start;
      padding-bottom: 4mm;
      border-bottom: 2px solid #1e4a8a;
      margin-bottom: 4mm;
    }
    .pl-header__left {
      min-width: 0;
    }
    .pl-company h1 {
      margin: 0 0 1mm;
      font-size: 13pt;
      font-weight: 700;
      color: #111;
      line-height: 1.25;
    }
    .pl-company p {
      margin: 0 0 0.8mm;
      font-size: 9.5pt;
      color: #334155;
    }
    .pl-company__contact {
      font-size: 9pt;
      color: #475569;
    }
    .pl-header__right {
      text-align: right;
      flex-shrink: 0;
    }
    .pl-title {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2mm;
      margin-bottom: 2mm;
    }
    .pl-title__text {
      font-size: 18pt;
      font-weight: 800;
      color: #1e4a8a;
      letter-spacing: 0.04em;
      line-height: 1;
    }
    .pl-title__icon {
      width: 11mm;
      height: 11mm;
      border-radius: 50%;
      background: #1e4a8a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pl-title__icon svg {
      width: 6mm;
      height: 6mm;
      display: block;
    }
    .pl-barcode {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5mm;
    }
    .pl-barcode svg {
      width: auto;
      height: auto;
      max-width: 100%;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .pl-barcode span {
      font-size: 8.5pt;
      color: #475569;
    }
    .pl-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2mm;
      margin-bottom: 4mm;
      padding: 2.5mm 0;
      border-top: 1px solid #93c5fd;
      border-bottom: 1px solid #93c5fd;
    }
    .pl-meta__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
      text-align: center;
      padding: 0 1mm;
    }
    .pl-meta__icon {
      width: 7mm;
      height: 7mm;
      color: #1e4a8a;
    }
    .pl-meta__icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .pl-meta__label {
      font-size: 8.5pt;
      color: #64748b;
      line-height: 1.2;
    }
    .pl-meta__value {
      font-size: 10pt;
      font-weight: 700;
      color: #111;
      line-height: 1.2;
      word-break: break-word;
    }
    .pl-table-wrap {
      flex: 1 1 auto;
      min-height: 0;
      margin-bottom: 0;
    }
    .pl-letter-bottom {
      margin-top: auto;
      flex-shrink: 0;
    }
    .pl-table-footer {
      margin-bottom: 4mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pl-box-section {
      margin-bottom: 4mm;
      page-break-inside: avoid;
    }
    .pl-box-section h3 {
      margin: 0 0 2mm;
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e4a8a;
    }
    .pl-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9.5pt;
    }
    .pl-table thead th {
      background: #1e4a8a;
      color: #fff;
      font-weight: 600;
      padding: 2mm 1.5mm;
      text-align: center;
      border: 1px solid #1e4a8a;
      white-space: nowrap;
    }
    .pl-table tbody td {
      padding: 1.8mm 1.5mm;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .pl-table tbody tr:nth-child(even) td {
      background: #f8fafc;
    }
    .pl-table td.num {
      text-align: right;
      white-space: nowrap;
    }
    .pl-table td.center {
      text-align: center;
    }
    .pl-table .pl-total-row td {
      background: #dbeafe !important;
      font-weight: 700;
    }
    .pl-table .pl-total-row td.pl-total-label {
      text-align: right;
      padding-right: 3mm;
    }
    .pl-table-footer .pl-total-row td {
      padding: 1.8mm 1.5mm;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      background: #dbeafe !important;
      font-weight: 700;
      border-top: 2px solid #1e4a8a;
    }
    .pl-table-footer .pl-total-row td.pl-total-label {
      text-align: right;
      padding-right: 3mm;
    }
    .pl-table--summary {
      margin: 0;
    }
    .pl-notes {
      margin-top: 0;
      padding: 3mm 3.5mm;
      border: 1px solid #93c5fd;
      border-radius: 4px;
      background: #f8fbff;
      display: flex;
      gap: 2.5mm;
      align-items: flex-start;
      page-break-inside: avoid;
    }
    .pl-notes__icon {
      width: 5mm;
      height: 5mm;
      color: #1e4a8a;
      flex-shrink: 0;
      margin-top: 0.5mm;
    }
    .pl-notes__icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .pl-notes p {
      margin: 0;
      font-size: 9pt;
      color: #334155;
      line-height: 1.45;
    }
    .pl-notes strong {
      color: #1e4a8a;
    }
    .pl-signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin-top: 6mm;
      text-align: center;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    .pl-signatures__line {
      border-bottom: 1px solid #334155;
      height: 10mm;
      margin-bottom: 1.5mm;
    }
    .pl-signatures__date {
      margin: 0 0 1mm;
      color: #64748b;
      font-size: 9pt;
      letter-spacing: 0.15em;
    }
    .pl-signatures__label {
      margin: 0;
      color: #334155;
    }
    .pl-signatures__name {
      margin-top: 1mm;
      font-size: 9pt;
      color: #64748b;
    }
    .pl-footer {
      margin-top: 3mm;
      padding-top: 3mm;
      border-top: 2px solid #1e4a8a;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 5mm;
      font-size: 9pt;
      color: #1e4a8a;
    }
    .pl-footer__item {
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }
    .pl-footer__item svg {
      width: 4mm;
      height: 4mm;
      display: block;
      flex-shrink: 0;
    }
    @media print {
      .pl-letter-bottom,
      .pl-table-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    @media screen {
      .pl-letter {
        outline: 1px dashed #cbd5e1;
        margin: 0 auto 12px;
        background: #fff;
      }
      .pl-letter:last-child {
        margin-bottom: 0;
      }
    }
  `;
}

function renderPackingColgroup(flat: boolean) {
  if (flat) {
    return `<colgroup>
      <col style="width:7%" />
      <col style="width:13%" />
      <col style="width:13%" />
      <col style="width:38%" />
      <col style="width:12%" />
      <col style="width:9%" />
      <col style="width:12%" />
    </colgroup>`;
  }
  return `<colgroup>
    <col style="width:14%" />
    <col style="width:14%" />
    <col style="width:40%" />
    <col style="width:12%" />
    <col style="width:10%" />
    <col style="width:12%" />
  </colgroup>`;
}

function renderPackingFlatTotalFooter(data: PackingListPrintData) {
  const totalWeight = packingListTotalWeight(data);
  return `<div class="pl-table-footer">
    <table class="pl-table pl-table--summary">
      ${renderPackingColgroup(true)}
      <tbody>
        <tr class="pl-total-row">
          <td colspan="4" class="pl-total-label">\u0e23\u0e27\u0e21</td>
          <td class="num">${escapeHtml(formatQty(data.totalQty))}</td>
          <td class="center"></td>
          <td class="num">${totalWeight > 0 ? escapeHtml(formatWeight(totalWeight)) : ''}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function renderPackingBoxTotalFooter(boxNo: number, qty: number, weight: number) {
  return `<div class="pl-table-footer">
    <table class="pl-table pl-table--summary">
      ${renderPackingColgroup(false)}
      <tbody>
        <tr class="pl-total-row">
          <td colspan="3" class="pl-total-label">\u0e23\u0e27\u0e21\u0e01\u0e25\u0e48\u0e2d\u0e07 ${boxNo}</td>
          <td class="num">${escapeHtml(formatQty(qty))}</td>
          <td class="center"></td>
          <td class="num">${weight > 0 ? escapeHtml(formatWeight(weight)) : ''}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function renderPackingListTotalFooter(
  data: PackingListPrintData,
  templateId: PackingTemplateId,
) {
  if (templateId === 'default') {
    return renderPackingFlatTotalFooter(data);
  }
  const boxNo = data.lines[0]?.boxNo ?? data.displayBoxNo ?? 1;
  const qty = data.lines.reduce((sum, line) => sum + line.qty, 0);
  const weight = data.lines.reduce((sum, line) => sum + line.weight, 0);
  return renderPackingBoxTotalFooter(boxNo, qty, weight);
}

function renderPackingRowsFlat(data: PackingListPrintData) {
  const rows = data.lines
    .map(
      (line) => `
      <tr>
        <td class="center">${data.displayBoxNo > 0 ? data.displayBoxNo : line.boxNo}</td>
        <td>${escapeHtml(line.skuCode)}</td>
        <td>${escapeHtml(line.goodsCode)}</td>
        <td>${escapeHtml(line.skuName)}</td>
        <td class="num">${escapeHtml(formatQty(line.qty))}</td>
        <td class="center">${escapeHtml(line.unitName)}</td>
        <td class="num">${line.weight > 0 ? escapeHtml(formatWeight(line.weight)) : ''}</td>
      </tr>`,
    )
    .join('');

  return `<table class="pl-table">
    ${renderPackingColgroup(true)}
    <thead>
      <tr>
        <th>\u0e01\u0e25\u0e48\u0e2d\u0e07</th>
        <th>\u0e23\u0e2b\u0e31\u0e08\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</th>
        <th>\u0e23\u0e2b\u0e31\u0e08\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e22</th>
        <th>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</th>
        <th>\u0e08\u0e33\u0e19\u0e27\u0e19</th>
        <th>\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e19\u0e31\u0e1a</th>
        <th>\u0e19\u0e49\u0e33\u0e2b\u0e19\u0e31\u0e01</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

function renderPackingSectionsByBox(data: PackingListPrintData) {
  const boxNos = [...new Set(data.lines.map((line) => line.boxNo))].sort(
    (a, b) => a - b,
  );

  return boxNos
    .map((boxNo) => {
      const lines = data.lines.filter((line) => line.boxNo === boxNo);
      const rows = lines
        .map(
          (line) => `
        <tr>
          <td>${escapeHtml(line.skuCode)}</td>
          <td>${escapeHtml(line.goodsCode)}</td>
          <td>${escapeHtml(line.skuName)}</td>
          <td class="num">${escapeHtml(formatQty(line.qty))}</td>
          <td class="center">${escapeHtml(line.unitName)}</td>
          <td class="num">${line.weight > 0 ? escapeHtml(formatWeight(line.weight)) : ''}</td>
        </tr>`,
        )
        .join('');

      return `
      <section class="pl-box-section">
        <h3>\u0e01\u0e25\u0e48\u0e2d\u0e07\u0e17\u0e35\u0e48 ${boxNo}</h3>
        <table class="pl-table">
          ${renderPackingColgroup(false)}
          <thead>
            <tr>
              <th>\u0e23\u0e2b\u0e31\u0e08\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</th>
              <th>\u0e23\u0e2b\u0e31\u0e08\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e22</th>
              <th>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</th>
              <th>\u0e08\u0e33\u0e19\u0e27\u0e19</th>
              <th>\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e19\u0e31\u0e1a</th>
              <th>\u0e19\u0e49\u0e33\u0e2b\u0e19\u0e31\u0e01</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>`;
    })
    .join('');
}

function renderPackingListPageBody(
  data: PackingListPrintData,
  templateId: PackingTemplateId,
) {
  const company = escapeHtml(formatShippingCompanyLine(data.address) || '-');
  const addressLines = formatLabelHeaderAddress(data.address)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
  const contactLine = escapeHtml(formatPackingListContactLine(data.address));
  const diRef = escapeHtml(data.document.diRef);
  const packer = escapeHtml(data.packerName?.trim() || '');
  const checker = escapeHtml(data.checkerName?.trim() || '');
  const barcode = renderCode39Svg(packingListBarcodeValue(data), PRINT_BARCODE_OPTIONS);
  const phone = escapeHtml(data.address.phone?.trim() || '-');
  const email = escapeHtml(
    data.address.email?.trim() || data.address.etaxEmail?.trim() || '-',
  );
  const website = escapeHtml(data.address.country?.trim() || '-');
  const body =
    templateId === 'by-box'
      ? renderPackingSectionsByBox(data)
      : renderPackingRowsFlat(data);

  return `<div class="pl-letter">
    <header class="pl-header">
      <div class="pl-header__left">
        <div class="pl-company">
          <h1>${company}</h1>
          ${addressLines}
          ${contactLine ? `<p class="pl-company__contact">${contactLine}</p>` : ''}
        </div>
      </div>
      <div class="pl-header__right">
        <div class="pl-title">
          <span class="pl-title__text">PACKING LIST</span>
          <span class="pl-title__icon" aria-hidden="true">${PL_ICONS.box}</span>
        </div>
        <div class="pl-barcode">
          ${barcode}
          <span>${diRef}</span>
        </div>
      </div>
    </header>

    <div class="pl-meta">
      ${plMetaItem('doc', '\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48', data.document.diRef)}
      ${plMetaItem('calendar', '\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48', formatThaiDate(data.document.diDate))}
      ${plMetaItem('building', '\u0e2a\u0e32\u0e02\u0e32', data.document.branch?.trim() || data.address.branch?.trim() || '-')}
      ${plMetaItem('box', '\u0e08\u0e33\u0e19\u0e27\u0e19\u0e01\u0e25\u0e48\u0e2d\u0e07', String(data.totalBoxes))}
    </div>

    <div class="pl-table-wrap">
      ${body}
    </div>

    <div class="pl-letter-bottom">
      ${renderPackingListTotalFooter(data, templateId)}

    <div class="pl-notes">
      <div class="pl-notes__icon" aria-hidden="true">${PL_ICONS.info}</div>
      <p>
        <strong>\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38:</strong>
        \u0e01\u0e23\u0e38\u0e13\u0e32\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2a\u0e20\u0e32\u0e1e\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e43\u0e2b\u0e49\u0e04\u0e23\u0e1a\u0e16\u0e49\u0e27\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e2a\u0e48\u0e07\u0e21\u0e2d\u0e1a \u0e2b\u0e32\u0e01\u0e1e\u0e1a\u0e04\u0e27\u0e32\u0e21\u0e40\u0e2a\u0e35\u0e22\u0e2b\u0e32\u0e22\u0e2b\u0e23\u0e37\u0e2d\u0e08\u0e33\u0e19\u0e27\u0e19\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19 \u0e41\u0e08\u0e49\u0e07\u0e1c\u0e39\u0e49\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e17\u0e31\u0e19\u0e17\u0e35 \u0e02\u0e19\u0e32\u0e14\u0e01\u0e23\u0e30\u0e14\u0e32\u0e29: Letter \u0e41\u0e19\u0e27\u0e15\u0e31\u0e49\u0e07 (8.5 x 11 \u0e19\u0e34\u0e49\u0e27) \u0e40\u0e2b\u0e21\u0e32\u0e30\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e21\u0e32\u0e15\u0e23\u0e10\u0e32\u0e19\u0e01\u0e32\u0e23\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e2a\u0e32\u0e01\u0e25 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e27\u0e21\u0e01\u0e31\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e17\u0e31\u0e49\u0e07\u0e27\u0e31\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e20\u0e32\u0e1e
      </p>
    </div>

    <div class="pl-signatures">
      <div>
        <div class="pl-signatures__line"></div>
        <div class="pl-signatures__date">....../....../........</div>
        <p class="pl-signatures__label">( \u0e1c\u0e39\u0e49\u0e08\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 )</p>
        ${packer ? `<div class="pl-signatures__name">${packer}</div>` : ''}
      </div>
      <div>
        <div class="pl-signatures__line"></div>
        <div class="pl-signatures__date">....../....../........</div>
        <p class="pl-signatures__label">( \u0e1c\u0e39\u0e49\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a )</p>
        ${checker ? `<div class="pl-signatures__name">${checker}</div>` : ''}
      </div>
      <div>
        <div class="pl-signatures__line"></div>
        <div class="pl-signatures__date">....../....../........</div>
        <p class="pl-signatures__label">( \u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 )</p>
      </div>
    </div>

    <footer class="pl-footer">
      <span class="pl-footer__item">${PL_ICONS.phone}<span>${phone}</span></span>
      <span class="pl-footer__item">${PL_ICONS.mail}<span>${email}</span></span>
      <span class="pl-footer__item">${PL_ICONS.globe}<span>${website}</span></span>
    </footer>
    </div>
  </div>`;
}

export function renderPackingListsHtml(
  dataList: PackingListPrintData[],
  templateId: PackingTemplateId = 'default',
  printerHint = '',
) {
  if (!dataList.length) {
    throw new Error('\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e1a\u0e23\u0e23\u0e08\u0e38');
  }

  const diRef = escapeHtml(dataList[0].document.diRef);
  const hint = `<div class="printer-hint">${escapeHtml(
    packingListHintText(printerHint),
  )}</div>`;
  const pages = dataList
    .map((data) => renderPackingListPageBody(data, templateId))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>Packing List ${diRef}</title>
  <style>
    ${printStyles('letter')}
    ${packingListLetterStyles()}
  </style>
</head>
<body>
  ${hint}
  <div class="print-root">
    ${pages}
  </div>
</body>
</html>`;
}

export function renderPackingListHtml(
  data: PackingListPrintData,
  templateId: PackingTemplateId = 'by-box',
  printerHint = '',
) {
  return renderPackingListsHtml([data], templateId, printerHint);
}

export type PrintDocumentOptions = {
  profile?: PrintPaperProfile;
  title?: string;
};

function frameSizeForProfile(profile: PrintPaperProfile) {
  if (profile === 'letter') {
    return { width: '8.5in', height: '11in' };
  }
  return { width: '210mm', height: '297mm' };
}

function createPrintFrame(html: string, profile: PrintPaperProfile = 'a4') {
  const frame = document.createElement('iframe');
  const size = frameSizeForProfile(profile);
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = size.width;
  frame.style.height = size.height;
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1b\u0e34\u0e14\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e48\u0e32\u0e07\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e44\u0e14\u0e49');
  }

  doc.open();
  doc.write(html);
  doc.close();
  return frame;
}

function docReady(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  return Boolean(doc && doc.readyState === 'complete');
}

async function waitForPrintReady(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc) return;
  try {
    await doc.fonts?.ready;
  } catch {
    // ignore font loading errors
  }
  await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
}

function printFrame(frame: HTMLIFrameElement, removeAfter = true) {
  const win = frame.contentWindow;
  if (!win) {
    if (frame.parentNode) document.body.removeChild(frame);
    throw new Error('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1b\u0e34\u0e14\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e48\u0e32\u0e07\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e44\u0e14\u0e49');
  }

  const trigger = async () => {
    await waitForPrintReady(frame);
    win.focus();
    win.print();
    if (removeAfter) {
      window.setTimeout(() => {
        if (frame.parentNode) document.body.removeChild(frame);
      }, 1500);
    }
  };

  if (docReady(frame)) {
    void trigger();
  } else {
    frame.onload = () => void trigger();
  }
}

export function printFromPreviewFrame(frame: HTMLIFrameElement) {
  printFrame(frame, false);
}

export function openPrintDocument(
  html: string,
  options: PrintDocumentOptions | string = {},
) {
  const opts: PrintDocumentOptions =
    typeof options === 'string' ? { title: options } : options;
  const profile = opts.profile ?? 'a4';
  const frame = createPrintFrame(html, profile);
  printFrame(frame, true);
}

/** \u0e40\u0e1b\u0e34\u0e14 dialog \u0e1e\u0e34\u0e21\u0e1e\u0e4c \u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01 Save as PDF */
export function downloadPdfViaPrint(
  html: string,
  profile: PrintPaperProfile = 'a4',
) {
  openPrintDocument(html, { profile, title: 'PDF' });
}

export function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import type { ScanSession, ScanSessionItem, ShippingAddress } from './client';
import type { DocumentListItem, DocumentLookupFunction } from '../types/packing';
import { packingListDtPropertiesSqlList } from '../config/erpConfig';
import { erpBaseBody, erpRequest, ErpError } from './erpClient';
import { mapRequiresFlags } from '../utils/serialLotUtils';
import { th } from '../text/th';

export interface DocumentFilters {
  fromDate: string;
  toDate: string;
  fromRef?: string;
  toRef?: string;
  /** AR_KEY â€” filter Oe000304 / Oe000404 / Oe001304: and ARD_AR=... */
  arKey?: string;
  /** DT_KEY â€” filter Oe000304 / Oe000404 / Oe001304: and DI_DT=... */
  dtKey?: string;
  /** WL_KEY â€” filter Oe000304 / Oe000404 / Oe001304: and trh_key in (select trd_trh from transtkd where trd_wl=...) */
  warehouseKey?: string;
  /** @deprecated à¹ÿà¸ÿà¹ÿ arKey à¹ÿà¸—à¸ÿ */
  partyCode?: string;
  docRef?: string;
  projectKey?: string;
}

interface PackingDocumentRow {
  DI_KEY: string;
  DI_DATE: string;
  DI_REF: string;
  DI_REMARK?: string;
  AR_CODE?: string;
  AR_NAME?: string;
}

export const DOCUMENT_LOOKUP_FUNCTIONS: readonly DocumentLookupFunction[] = [
  'Oe000304',
  'Oe000404',
  'Oe001304',
] as const;

/** à¸¥à¸³à¸”à¸±à¸ÿà¸ÿà¸²à¸£à¹ÿà¸«à¸¥à¸”à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸­à¸ÿà¸ªà¸²à¸£à¸•à¸­à¸ÿà¹€à¸£à¸´à¹ÿà¸¡à¸ÿà¸±à¸”à¸ªà¸´à¸ÿà¸ÿà¹ÿà¸² (/documents) */
export const DOCUMENT_DETAIL_FUNCTIONS = [
  'GetSellOrderDocinfo',
  'GetCashSalesDocinfo',
  'GetReceiveDocinfo',
  'GetPurchaseOrderDocinfo',
  'GetOtherIcDocinfo',
] as const;

export type DocumentDetailFunction = (typeof DOCUMENT_DETAIL_FUNCTIONS)[number];

interface ErpDocInfoResponse {
  DOCINFO?: Record<string, string>;
  ARDETAIL?: Record<string, string>;
  TRANSTKH?: Record<string, string>;
  TRANSTKD?: Record<string, string> | Record<string, string>[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isoToErpDate(iso: string) {
  return iso.replace(/-/g, '');
}

function erpDateToIso(value: string) {
  const raw = value.trim();
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

function escapeFilter(value: string) {
  return value.replace(/'/g, "''");
}

function pickLookupRows<T>(
  data: Record<string, unknown>,
  functionName: string,
): T[] {
  const direct = data[functionName];
  if (direct !== undefined) return asArray(direct as T | T[]);

  const match = Object.entries(data).find(
    ([key]) => key.toLowerCase() === functionName.toLowerCase(),
  );
  if (match) return asArray(match[1] as T | T[]);
  return [];
}

function buildLookupFilter(filters: DocumentFilters) {
  let filter = ` AND DT_PROPERTIES in (${packingListDtPropertiesSqlList()})`;

  if (filters.fromDate) {
    filter += ` AND DI_DATE >= '${isoToErpDate(filters.fromDate)}'`;
  }
  if (filters.toDate) {
    filter += ` AND DI_DATE <= '${isoToErpDate(filters.toDate)}'`;
  }
  if (filters.fromRef?.trim()) {
    filter += ` AND DI_REF >= '${escapeFilter(filters.fromRef.trim())}'`;
  }
  if (filters.toRef?.trim()) {
    filter += ` AND DI_REF <= '${escapeFilter(filters.toRef.trim())}'`;
  }
  if (filters.dtKey?.trim()) {
    filter += ` and DI_DT=${escapeFilter(filters.dtKey.trim())}`;
  }
  if (filters.arKey?.trim()) {
    filter += ` and ARD_AR=${escapeFilter(filters.arKey.trim())}`;
  } else if (filters.partyCode?.trim()) {
    filter += ` AND AR_CODE = '${escapeFilter(filters.partyCode.trim())}'`;
  }
  if (filters.warehouseKey?.trim()) {
    const wlKey = escapeFilter(filters.warehouseKey.trim());
    filter += ` and trh_key in (select trd_trh from transtkd where trd_wl=${wlKey})`;
  }
  if (filters.docRef?.trim()) {
    filter += ` AND DI_REF = '${escapeFilter(filters.docRef.trim())}'`;
  }
  if (filters.projectKey?.trim()) {
    filter += ` and TRH_PRJ=${escapeFilter(filters.projectKey.trim())}`;
  }

  return filter;
}

function parseNumber(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapShippingAddress(
  diKey: number,
  transtkh: Record<string, string>,
): ShippingAddress {
  return {
    diKey,
    trhKey: parseNumber(transtkh.TRH_DEPT),
    addbKey: parseNumber(transtkh.TRH_SHIP_ADDB, NaN) || null,
    company: transtkh.ADDB_COMPANY ?? '',
    branch: transtkh.ADDB_BRANCH ?? '',
    brNo: transtkh.ADDB_BR_NO ?? '',
    taxId: transtkh.ADDB_TAX_ID ?? '',
    regNo: transtkh.ADDB_REG_NO ?? '',
    passport: '',
    visa: '',
    line1: transtkh.ADDB_ADDB_1 ?? '',
    line2: transtkh.ADDB_ADDB_2 ?? '',
    line3: transtkh.ADDB_ADDB_3 ?? '',
    subDistrict: transtkh.ADDB_SUB_DISTRICT ?? '',
    district: transtkh.ADDB_DISTRICT ?? '',
    province: transtkh.ADDB_PROVINCE ?? '',
    postCode: transtkh.ADDB_POST ?? '',
    country: transtkh.ADDB_PROVINCE ?? '',
    countryCode: '',
    email: transtkh.ADDB_EMAIL ?? '',
    etaxEmail: '',
    phone: transtkh.ADDB_PHONE ?? '',
    fax: transtkh.ADDB_FAX ?? '',
    shipMethod:
      transtkh.SB_NAME?.trim() ||
      transtkh.TRH_SHIPBY_NAME?.trim() ||
      transtkh.TRH_SHIP_BY?.trim() ||
      '',
  };
}

function mapLineItem(
  row: Record<string, string>,
  diKey: number,
): ScanSessionItem {
  const trdQty = parseNumber(row.TRD_QTY, 0);
  const unitQty = parseNumber(row.TRD_UTQQTY, 1) || 1;
  const flags = mapRequiresFlags(row);

  return {
    itemId: crypto.randomUUID(),
    sourceDiKey: diKey,
    sourceTrdKey: parseNumber(row.TRD_SEQ),
    goodsCode: row.GOODS_CODE ?? row.TRD_KEYIN ?? '',
    skuCode: row.SKU_CODE ?? row.GOODS_CODE ?? '',
    skuName: row.SKU_NAME ?? '',
    unitName: row.TRD_UTQNAME ?? '',
    unitQty,
    unitWeight: parseNumber(row.TRD_WEIGHT),
    documentQty: trdQty,
    freeQty: parseNumber(row.TRD_Q_FREE),
    remainingQty: trdQty,
    scanQty: 0,
    boxNo: 0,
    seq: 999999999,
    lotNo: row.TRD_LOT_NO || null,
    serialNo: row.TRD_SERIAL || null,
    requiresSerial: flags.requiresSerial,
    requiresLot: flags.requiresLot,
    mfgDate: flags.mfgDate,
    expDate: flags.expDate,
  };
}

async function lookupDocumentsByFunction(
  loginGuid: string,
  erpFunction: DocumentLookupFunction,
  filters: DocumentFilters,
) {
  const body = erpBaseBody(loginGuid, erpFunction, '');
  body['BPAPUS-FILTER'] = buildLookupFilter(filters);

  const data = await erpRequest<Record<string, unknown>>('LookupErp', body);
  return pickLookupRows<PackingDocumentRow>(data, erpFunction);
}

async function lookupDocuments(loginGuid: string, filters: DocumentFilters) {
  const seen = new Set<string>();
  const merged: PackingDocumentRow[] = [];

  for (const erpFunction of DOCUMENT_LOOKUP_FUNCTIONS) {
    try {
      const rows = await lookupDocumentsByFunction(loginGuid, erpFunction, filters);
      for (const row of rows) {
        const key = String(row.DI_KEY ?? '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(row);
      }
    } catch {
      // à¸ÿà¹ÿà¸²à¸¡ function à¸—à¸µà¹ÿà¸¥à¹ÿà¸¡à¹€à¸«à¸¥à¸§ à¹ÿà¸¥à¹ÿà¸§à¸£à¸§à¸¡à¸ÿà¸¥à¸ÿà¸²à¸ÿ function à¸­à¸·à¹ÿà¸ÿà¸•à¹ÿà¸­
    }
  }

  return merged;
}

async function getDocInfoByFunction(
  loginGuid: string,
  erpFunction: DocumentDetailFunction,
  diKey: string,
) {
  const param = JSON.stringify({ DI_KEY: diKey });
  const body = erpBaseBody(loginGuid, erpFunction, param);
  return erpRequest<ErpDocInfoResponse>('UpdateErp', body);
}

function isDocInfoFound(response: ErpDocInfoResponse, diKey: string) {
  const loadedKey = String(response.DOCINFO?.DI_KEY ?? '').trim();
  return loadedKey !== '' && loadedKey === String(diKey).trim();
}

/** à¸¥à¸­à¸ÿà¹ÿà¸«à¸¥à¸”à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸­à¸ÿà¸ªà¸²à¸£à¸—à¸µà¸¥à¸° function à¸ÿà¸ÿà¸ÿà¸ÿà¸ÿà¹ÿà¸­à¸¡à¸¹à¸¥ */
async function resolveDocumentDetail(loginGuid: string, diKey: string) {
  for (const erpFunction of DOCUMENT_DETAIL_FUNCTIONS) {
    try {
      const response = await getDocInfoByFunction(loginGuid, erpFunction, diKey);
      if (isDocInfoFound(response, diKey)) {
        return response;
      }
    } catch {
      // à¹ÿà¸¡à¹ÿà¸ÿà¸ÿà¹ÿà¸ÿ function à¸ÿà¸µà¹ÿ â€” à¸¥à¸­à¸ÿ function à¸–à¸±à¸”à¹ÿà¸ÿ
    }
  }

  throw new ErpError(th.documents.loadFailed);
}

function buildSessionFromDocInfo(
  responses: ErpDocInfoResponse[],
): ScanSession {
  const documents: ScanSession['documents'] = [];
  const shippingAddresses: ShippingAddress[] = [];
  const items: ScanSessionItem[] = [];

  for (const response of responses) {
    const docInfo = response.DOCINFO;
    if (!docInfo?.DI_KEY) continue;

    const diKey = parseNumber(docInfo.DI_KEY);
    const arDetail = response.ARDETAIL ?? {};

    documents.push({
      diKey,
      diDate: erpDateToIso(docInfo.DI_DATE ?? ''),
      diRef: docInfo.DI_REF ?? '',
      partyCode: arDetail.AR_CODE ?? undefined,
      partyName: arDetail.AR_NAME ?? undefined,
    });

    if (response.TRANSTKH) {
      shippingAddresses.push(mapShippingAddress(diKey, response.TRANSTKH));
    }

    for (const row of asArray(response.TRANSTKD)) {
      items.push(mapLineItem(row, diKey));
    }
  }

  return {
    sessionId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    module: 'PackingList',
    status: 'open',
    workflowStatus: th.workflow.packing,
    currentBoxNo: 1,
    documents,
    shippingAddresses,
    items,
    boxes: [],
    activePartyCode: null,
    activeDiKey: null,
    scanHistory: [],
    startedAt: new Date().toISOString(),
  };
}

function compareDocumentListItems(a: DocumentListItem, b: DocumentListItem) {
  const byDate = a.diDate.localeCompare(b.diDate);
  if (byDate !== 0) return byDate;
  return a.diRef.localeCompare(b.diRef, 'th');
}

function mapRowToListItem(row: PackingDocumentRow): DocumentListItem {
  return {
    diKey: parseNumber(row.DI_KEY),
    diDate: erpDateToIso(row.DI_DATE ?? ''),
    diRef: row.DI_REF ?? '',
    partyCode: row.AR_CODE,
    partyName: row.AR_NAME,
    remark: row.DI_REMARK,
    workflowStatus: th.workflow.waiting,
  };
}

/** Â§3.2 â€” à¸ÿà¹ÿà¸ÿà¸«à¸²à¸£à¸²à¸¢à¸ÿà¸²à¸£à¹€à¸­à¸ÿà¸ªà¸²à¸£à¸£à¸§à¸¡à¸ÿà¸²à¸ÿà¸—à¸¸à¸ÿ ERP function (à¸¢à¸±à¸ÿà¹ÿà¸¡à¹ÿà¹ÿà¸«à¸¥à¸”à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”) */
export async function searchDocumentsFromErp(
  loginGuid: string,
  filters: DocumentFilters,
): Promise<DocumentListItem[]> {
  const rows = await lookupDocuments(loginGuid, filters);
  return rows.map(mapRowToListItem).sort(compareDocumentListItems);
}

/** à¹ÿà¸«à¸¥à¸” session à¸ÿà¸²à¸ÿ DI_KEY à¸—à¸µà¹ÿà¹€à¸¥à¸·à¸­à¸ÿ */
export async function loadSessionFromDiKeys(
  loginGuid: string,
  diKeys: number[],
): Promise<ScanSession> {
  if (!diKeys.length) {
    return buildSessionFromDocInfo([]);
  }

  const uniqueKeys = [...new Set(diKeys)];
  const responses = await Promise.all(
    uniqueKeys.map((diKey) => resolveDocumentDetail(loginGuid, String(diKey))),
  );

  return buildSessionFromDocInfo(responses);
}

/** à¹ÿà¸«à¸¥à¸”à¸—à¸¸à¸ÿà¹€à¸­à¸ÿà¸ªà¸²à¸£à¸•à¸²à¸¡ filter (legacy) */
export async function loadSessionFromErp(
  loginGuid: string,
  filters: DocumentFilters,
): Promise<ScanSession> {
  const rows = await lookupDocuments(loginGuid, filters);
  if (!rows.length) {
    return buildSessionFromDocInfo([]);
  }

  const uniqueKeys = [...new Set(rows.map((row) => parseNumber(row.DI_KEY)).filter(Boolean))];
  return loadSessionFromDiKeys(loginGuid, uniqueKeys);
}
